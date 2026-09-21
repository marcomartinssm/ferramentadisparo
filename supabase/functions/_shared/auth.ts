import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Libera a chamada somente para:
//  1) as próprias funções do sistema (chamando umas às outras),
//  2) as tarefas agendadas (cabeçalho x-cron-secret igual ao salvo em app_settings),
//  3) usuários logados que estão na tabela disparo_usuarios.
// Retorna null quando está liberado, ou uma resposta 401/403 para devolver.
export async function exigirAcesso(req: Request, corsHeaders: Record<string, string>): Promise<Response | null> {
  const negar = (status: number, error: string) =>
    new Response(JSON.stringify({ error }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (token && token === serviceKey) return null;

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);

  const cronSecret = req.headers.get("x-cron-secret");
  if (cronSecret) {
    const { data } = await admin.from("app_settings").select("value").eq("key", "cron_secret").maybeSingle();
    if (data?.value && data.value === cronSecret) return null;
    return negar(401, "Chave de agendamento inválida");
  }

  if (!token) return negar(401, "Faça login para continuar");
  const { data: userData } = await admin.auth.getUser(token);
  const email = userData?.user?.email?.toLowerCase();
  if (!email) return negar(401, "Sessão expirada. Faça login novamente.");

  const { data: permitido } = await admin.from("disparo_usuarios").select("email").eq("email", email).maybeSingle();
  if (!permitido) return negar(403, "Seu usuário não tem acesso à ferramenta de disparo");
  return null;
}
