import { exigirAcesso } from "../_shared/auth.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Confere com a Meta se o WABA e o número cadastrados batem. Devolve só IDs e nomes, nunca o token.
// Com { "acao": "inscrever_app" } no corpo, liga o WABA ao app do token (para receber as mensagens no webhook).
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const GRAPH = "https://graph.facebook.com/v21.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const bloqueio = await exigirAcesso(req, corsHeaders);
  if (bloqueio) return bloqueio;

  const corpo = await req.json().catch(() => ({}));
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: conns } = await supabase.from("meta_connections").select("id, waba_id, phone_number_id, access_token");

  const resultado: any[] = [];
  for (const c of conns || []) {
    const t = c.access_token;
    const get = async (path: string) => {
      const r = await fetch(`${GRAPH}/${path}${path.includes("?") ? "&" : "?"}access_token=${encodeURIComponent(t)}`);
      return r.json();
    };
    let inscricao: any = null;
    if (corpo?.acao === "inscrever_app") {
      const r = await fetch(`${GRAPH}/${c.waba_id}/subscribed_apps`, {
        method: "POST",
        headers: { Authorization: `Bearer ${t}` },
      });
      inscricao = await r.json();
    }
    resultado.push({
      inscricao,
      cadastrado: { waba_id: c.waba_id, phone_number_id: c.phone_number_id },
      waba: await get(`${c.waba_id}?fields=id,name`),
      numeros_do_waba: await get(`${c.waba_id}/phone_numbers?fields=id,display_phone_number,verified_name,status`),
      apps_inscritos_no_waba: await get(`${c.waba_id}/subscribed_apps`),
      app_do_token: await get(`app?fields=id,name`),
    });
  }

  return new Response(JSON.stringify(resultado, null, 2), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
