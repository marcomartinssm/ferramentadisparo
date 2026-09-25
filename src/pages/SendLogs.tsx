import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, XCircle, Loader2, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

// Cada tentativa de envio para a Meta (tabela disparo_log_envios, gravada pela função send-meta-message)
interface Registro {
  id: string;
  created_at: string;
  origem: string | null;
  telefone: string | null;
  tipo: string | null;
  template: string | null;
  sucesso: boolean;
  http_status: number | null;
  erro_codigo: number | null;
  erro: string | null;
  message_id: string | null;
  pedido: unknown;
  resposta: unknown;
  duracao_ms: number | null;
}

const ORIGENS: Record<string, string> = { broadcast: "Campanha", flow: "Fluxo", manual: "Conversas" };

function quando(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function SendLogs() {
  const [soFalhas, setSoFalhas] = useState(false);
  const [aberto, setAberto] = useState<string | null>(null);

  const { data: registros = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["registros-envio", soFalhas],
    queryFn: async () => {
      let q = supabase
        .from("disparo_log_envios" as never)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (soFalhas) q = q.eq("sucesso", false);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as Registro[];
    },
    refetchInterval: 15_000,
  });

  const falhas = registros.filter((r) => !r.sucesso).length;

  return (
    <div className="animate-fade-in-up space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Registros de envio</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Cada tentativa de envio para a Meta, com o motivo exato quando falha. Guardado por 90 dias.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Switch checked={soFalhas} onCheckedChange={setSoFalhas} /> Só falhas
          </label>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-1.5">
            <RefreshCw className={cn("w-4 h-4", isFetching && "animate-spin")} /> Atualizar
          </Button>
        </div>
      </div>

      {!soFalhas && registros.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Últimos {registros.length}: {registros.length - falhas} enviados · {falhas} com falha
        </p>
      )}

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading && (
          <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        )}
        {!isLoading && registros.length === 0 && (
          <p className="text-sm text-muted-foreground p-8 text-center">Nenhum envio registrado ainda.</p>
        )}
        {registros.map((r) => {
          const expandido = aberto === r.id;
          return (
            <div key={r.id} className="border-b border-border/60 last:border-0">
              <button
                onClick={() => setAberto(expandido ? null : r.id)}
                className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-muted/40 transition-colors"
              >
                {expandido ? <ChevronDown className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />}
                {r.sucesso
                  ? <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-500 shrink-0" aria-label="Enviado" />
                  : <XCircle className="w-4 h-4 mt-0.5 text-destructive shrink-0" aria-label="Falhou" />}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm">
                    <span className="text-muted-foreground tabular-nums">{quando(r.created_at)}</span>
                    <span className="font-medium text-foreground">{r.telefone || "—"}</span>
                    <span className="text-muted-foreground">{ORIGENS[r.origem || ""] || r.origem}</span>
                    <span className="text-muted-foreground">{r.template ? `Template: ${r.template}` : r.tipo}</span>
                  </div>
                  {!r.sucesso && r.erro && <p className="text-xs text-destructive mt-1 break-words">{r.erro}</p>}
                </div>
              </button>
              {expandido && (
                <div className="px-11 pb-4 grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">O que foi enviado</p>
                    <pre className="text-xs bg-muted/40 rounded-md p-3 overflow-auto max-h-64 whitespace-pre-wrap break-all">{JSON.stringify(r.pedido, null, 2)}</pre>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
                      Resposta da Meta {r.http_status ? `(HTTP ${r.http_status})` : ""} {r.duracao_ms != null ? `· ${r.duracao_ms} ms` : ""}
                    </p>
                    <pre className="text-xs bg-muted/40 rounded-md p-3 overflow-auto max-h-64 whitespace-pre-wrap break-all">{JSON.stringify(r.resposta, null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
