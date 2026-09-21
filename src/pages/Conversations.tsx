import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, CheckCheck, AlertCircle, Clock, Loader2, MessageCircle, Search, Send } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

// Uma linha por contato que já trocou mensagens (view disparo_conversas)
interface Conversa {
  contact_id: string;
  name: string;
  phone: string;
  ultima_mensagem: string;
  ultima_direcao: "inbound" | "outbound";
  ultima_em: string;
  ultima_do_cliente_em: string | null;
  total_mensagens: number;
}

interface Mensagem {
  id: string;
  direction: "inbound" | "outbound";
  content: string;
  media_url: string | null;
  message_type: string | null;
  status: string | null;
  error_message: string | null;
  source: string;
  created_at: string;
}

interface TemplateAprovado {
  id: string;
  name: string;
  language: string;
  components: any[];
}

const JANELA_MS = 24 * 3600_000;

// Só templates sem variáveis ({{1}}) podem ser enviados daqui, porque não há como preencher os valores
function templateSemVariaveis(t: TemplateAprovado) {
  const body = (t.components || []).find((c: any) => c.type === "BODY");
  return !/\{\{\d+\}\}/.test(body?.text || "");
}

function textoDoTemplate(t: TemplateAprovado) {
  return (t.components || []).find((c: any) => c.type === "BODY")?.text || `[Template: ${t.name}]`;
}

function midiaDoCabecalho(t: TemplateAprovado) {
  const h = (t.components || []).find((c: any) => c.type === "HEADER");
  if (h && ["IMAGE", "VIDEO", "DOCUMENT"].includes(h.format) && h.mediaUrl) {
    return { type: h.format.toLowerCase(), url: h.mediaUrl };
  }
  return undefined;
}

// Lê o motivo real do erro devolvido pela função de envio
async function motivoDoErro(error: any) {
  try {
    const body = await error?.context?.json();
    return body?.error || error.message;
  } catch {
    return error?.message || "Erro ao enviar";
  }
}
const ATUALIZAR_MS = 10_000;

function horario(iso: string) {
  const d = new Date(iso);
  const hoje = new Date();
  const mesmoDia = d.toDateString() === hoje.toDateString();
  return mesmoDia
    ? d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) + " " +
      d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatarTelefone(phone: string) {
  const d = phone.replace(/\D/g, "");
  if (d.length === 13) return `+${d.slice(0, 2)} ${d.slice(2, 4)} ${d.slice(4, 9)}-${d.slice(9)}`;
  if (d.length === 12) return `+${d.slice(0, 2)} ${d.slice(2, 4)} ${d.slice(4, 8)}-${d.slice(8)}`;
  return phone;
}

// Quanto tempo ainda resta para mandar texto livre (24h após a última mensagem do cliente)
function janela(ultimaDoCliente: string | null) {
  if (!ultimaDoCliente) return { aberta: false, texto: "Cliente ainda não respondeu" };
  const resta = new Date(ultimaDoCliente).getTime() + JANELA_MS - Date.now();
  if (resta <= 0) return { aberta: false, texto: "Fora das 24h: só template" };
  const h = Math.floor(resta / 3600_000);
  const m = Math.floor((resta % 3600_000) / 60_000);
  return { aberta: true, texto: `Texto livre liberado por mais ${h}h${String(m).padStart(2, "0")}` };
}

function StatusEnvio({ status }: { status: string | null }) {
  if (status === "read") return <CheckCheck className="w-3.5 h-3.5 text-sky-400" aria-label="Lida" />;
  if (status === "delivered") return <CheckCheck className="w-3.5 h-3.5 opacity-70" aria-label="Entregue" />;
  if (status === "failed") return <AlertCircle className="w-3.5 h-3.5 text-destructive" aria-label="Falhou" />;
  if (status === "sent") return <Check className="w-3.5 h-3.5 opacity-70" aria-label="Enviada" />;
  return <Clock className="w-3 h-3 opacity-60" aria-label="Enviando" />;
}

export default function Conversations() {
  const [busca, setBusca] = useState("");
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const fimRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const [texto, setTexto] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [enviando, setEnviando] = useState(false);

  // Canal usado para responder: o padrão ativo
  const { data: canal } = useQuery({
    queryKey: ["canal-padrao"],
    queryFn: async () => {
      const { data } = await supabase
        .from("whatsapp_instances")
        .select("id, name")
        .eq("is_active", true)
        .order("is_default", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["templates-aprovados"],
    queryFn: async () => {
      const { data } = await supabase
        .from("meta_templates")
        .select("id, name, language, components")
        .eq("status", "APPROVED")
        .order("name");
      return ((data ?? []) as unknown as TemplateAprovado[]).filter(templateSemVariaveis);
    },
  });

  const { data: conversas = [], isLoading } = useQuery({
    queryKey: ["conversas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("disparo_conversas" as never)
        .select("*")
        .order("ultima_em", { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data ?? []) as unknown as Conversa[];
    },
    refetchInterval: ATUALIZAR_MS,
  });

  const { data: mensagens = [], isLoading: carregandoMensagens } = useQuery({
    queryKey: ["conversa", selecionada],
    enabled: !!selecionada,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversation_messages")
        .select("id, direction, content, media_url, message_type, status, error_message, source, created_at")
        .eq("contact_id", selecionada!)
        .order("created_at", { ascending: true })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as Mensagem[];
    },
    refetchInterval: ATUALIZAR_MS,
  });

  const filtradas = useMemo(() => {
    const t = busca.trim().toLowerCase();
    if (!t) return conversas;
    const digitos = t.replace(/\D/g, "");
    return conversas.filter((c) =>
      c.name?.toLowerCase().includes(t) || (digitos && c.phone.replace(/\D/g, "").includes(digitos))
    );
  }, [conversas, busca]);

  const atual = conversas.find((c) => c.contact_id === selecionada) || null;
  const statusJanela = atual ? janela(atual.ultima_do_cliente_em) : null;

  useEffect(() => {
    fimRef.current?.scrollIntoView({ block: "end" });
  }, [mensagens.length, selecionada]);

  useEffect(() => {
    setTexto("");
    setTemplateId("");
  }, [selecionada]);

  const enviar = async () => {
    if (!atual || !canal) return;
    const podeTexto = janela(atual.ultima_do_cliente_em).aberta;
    let corpo: Record<string, unknown>;
    if (podeTexto) {
      if (!texto.trim()) return;
      corpo = { instance_id: canal.id, phone_number: atual.phone, content: texto.trim(), message_type: "text", source: "manual" };
    } else {
      const t = templates.find((x) => x.id === templateId);
      if (!t) return;
      corpo = {
        instance_id: canal.id,
        phone_number: atual.phone,
        message_type: "template",
        template_name: t.name,
        template_language: t.language || "pt_BR",
        header_media: midiaDoCabecalho(t),
        content: textoDoTemplate(t),
        source: "manual",
      };
    }
    setEnviando(true);
    const { error } = await supabase.functions.invoke("send-meta-message", { body: corpo });
    setEnviando(false);
    if (error) {
      toast.error(await motivoDoErro(error));
      return;
    }
    setTexto("");
    setTemplateId("");
    queryClient.invalidateQueries({ queryKey: ["conversa", selecionada] });
    queryClient.invalidateQueries({ queryKey: ["conversas"] });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)] animate-fade-in-up">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-foreground">Conversas</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Mensagens enviadas pelas campanhas e fluxos, e o que os clientes responderam. Atualiza sozinho a cada 10 segundos.
        </p>
      </div>

      <div className="flex flex-1 min-h-0 rounded-xl border border-border overflow-hidden bg-card">
        {/* Lista de conversas */}
        <aside className="w-[320px] shrink-0 border-r border-border flex flex-col min-h-0">
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar nome ou telefone"
                className="h-9 pl-8"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoading && (
              <div className="flex justify-center p-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            )}
            {!isLoading && filtradas.length === 0 && (
              <p className="text-sm text-muted-foreground p-6 text-center">
                {conversas.length === 0 ? "Nenhuma conversa ainda. Elas aparecem aqui quando você envia ou recebe mensagens." : "Nada encontrado."}
              </p>
            )}
            {filtradas.map((c) => {
              const aberta = janela(c.ultima_do_cliente_em).aberta;
              return (
                <button
                  key={c.contact_id}
                  onClick={() => setSelecionada(c.contact_id)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 border-b border-border/60 hover:bg-muted/50 transition-colors",
                    selecionada === c.contact_id && "bg-muted"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm text-foreground truncate flex items-center gap-1.5">
                      {aberta && <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Dentro das 24h" />}
                      {c.name && c.name !== c.phone ? c.name : formatarTelefone(c.phone)}
                    </span>
                    <span className="text-[11px] text-muted-foreground shrink-0">{horario(c.ultima_em)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {c.ultima_direcao === "outbound" ? "Você: " : ""}{c.ultima_mensagem}
                  </p>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Conversa aberta */}
        <section className="flex-1 flex flex-col min-w-0">
          {!atual ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <MessageCircle className="w-8 h-8" />
              <p className="text-sm">Escolha uma conversa na lista</p>
            </div>
          ) : (
            <>
              <header className="px-4 py-3 border-b border-border flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground truncate">
                    {atual.name && atual.name !== atual.phone ? atual.name : formatarTelefone(atual.phone)}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatarTelefone(atual.phone)} · {atual.total_mensagens} mensagens</p>
                </div>
                {statusJanela && (
                  <span
                    className={cn(
                      "text-xs px-2.5 py-1 rounded-full border shrink-0",
                      statusJanela.aberta
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    )}
                  >
                    {statusJanela.texto}
                  </span>
                )}
              </header>

              <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-muted/20">
                {carregandoMensagens && (
                  <div className="flex justify-center p-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                )}
                {mensagens.map((m) => {
                  const minha = m.direction === "outbound";
                  return (
                    <div key={m.id} className={cn("flex", minha ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-[70%] rounded-lg px-3 py-2 text-sm shadow-sm",
                          minha ? "bg-primary/15 text-foreground rounded-br-sm" : "bg-card border border-border text-foreground rounded-bl-sm"
                        )}
                      >
                        {m.media_url && (
                          <a href={m.media_url} target="_blank" rel="noreferrer" className="block text-xs underline text-muted-foreground mb-1">
                            Ver mídia anexada
                          </a>
                        )}
                        {m.message_type === "button" && (
                          <span className="block text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">Clicou no botão</span>
                        )}
                        <p className="whitespace-pre-wrap break-words">{m.content}</p>
                        <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-muted-foreground">
                          {minha && m.source === "broadcast" && <span>Campanha ·</span>}
                          {minha && m.source === "flow" && <span>Fluxo ·</span>}
                          {minha && m.source === "manual" && <span>Você ·</span>}
                          <span>{horario(m.created_at)}</span>
                          {minha && <StatusEnvio status={m.status} />}
                        </div>
                        {m.status === "failed" && m.error_message && (
                          <p className="text-[11px] text-destructive mt-1">{m.error_message}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={fimRef} />
              </div>

              {/* Responder */}
              <footer className="border-t border-border p-3 bg-card">
                {!canal ? (
                  <p className="text-xs text-muted-foreground">Cadastre um canal em Canais de WhatsApp para responder.</p>
                ) : statusJanela?.aberta ? (
                  <div className="flex items-end gap-2">
                    <Textarea
                      value={texto}
                      onChange={(e) => setTexto(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          enviar();
                        }
                      }}
                      placeholder="Digite sua resposta (Enter envia, Shift+Enter pula linha)"
                      className="min-h-[44px] max-h-40 resize-none text-sm"
                      rows={1}
                    />
                    <Button onClick={enviar} disabled={enviando || !texto.trim()} className="h-11 gap-1.5">
                      {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Enviar
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      O cliente não respondeu nas últimas 24 horas. A Meta só permite enviar um template aprovado.
                    </p>
                    <div className="flex items-center gap-2">
                      <Select value={templateId} onValueChange={setTemplateId}>
                        <SelectTrigger className="h-10 flex-1">
                          <SelectValue placeholder={templates.length ? "Escolha um template aprovado" : "Nenhum template aprovado sem variáveis"} />
                        </SelectTrigger>
                        <SelectContent>
                          {templates.map((t) => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button onClick={enviar} disabled={enviando || !templateId} className="h-10 gap-1.5">
                        {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Enviar template
                      </Button>
                    </div>
                  </div>
                )}
              </footer>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
