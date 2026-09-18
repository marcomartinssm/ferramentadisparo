import { type Node } from "@xyflow/react";
import { X, Trash2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useBroadcasts } from "@/hooks/useBroadcasts";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface Props {
  node: Node;
  allNodes?: Node[];
  onUpdate: (nodeId: string, config: Record<string, any>) => void;
  onDelete: (nodeId: string) => void;
  onClose: () => void;
}

export default function FlowNodeConfigPanel({ node, allNodes, onUpdate, onDelete, onClose }: Props) {
  const nodeType = (node.data as any).type || "message";
  const config: Record<string, any> = (node.data as any).config || {};
  const flowId = (node.data as any).flowId as string | undefined;
  const { campaigns } = useBroadcasts();
  const queryClient = useQueryClient();

  const { data: metaTemplates = [] } = useQuery({
    queryKey: ['meta-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meta_templates')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const set = (key: string, value: any) => {
    onUpdate(node.id, { ...config, [key]: value });
  };

  const extractBodyText = (components: any): string => {
    if (!Array.isArray(components)) return '';
    const body = components.find((c: any) => c.type === 'BODY');
    return body?.text || '';
  };

  return (
    <div className="w-[300px] border-l bg-background p-4 overflow-y-auto shrink-0 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Configurar Card</h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Common label */}
      <div>
        <Label className="text-xs">Rótulo</Label>
        <Input
          value={config.label || ""}
          onChange={(e) => set("label", e.target.value)}
          placeholder="Nome do card"
          className="h-8"
        />
      </div>

      {/* Type-specific fields */}
      {nodeType === "message" && (
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Template de mensagem</Label>
            <Select
              value={config.template_id || ""}
              onValueChange={(v) => {
                const tpl = metaTemplates.find((t) => t.id === v);
                if (tpl) {
                  const bodyText = extractBodyText(tpl.components);
                  onUpdate(node.id, {
                    ...config,
                    template_id: tpl.id,
                    template_name: tpl.name,
                    content: bodyText,
                    content_type: "text",
                  });
                }
              }}
            >
              <SelectTrigger className="h-8"><SelectValue placeholder="Selecione um template" /></SelectTrigger>
              <SelectContent>
                {metaTemplates.length === 0 && (
                  <SelectItem value="__empty" disabled>Nenhum template criado</SelectItem>
                )}
                {metaTemplates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                    <span className="ml-2 text-muted-foreground text-[10px]">({t.category})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {config.template_id && config.content && (
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Preview</p>
              <p className="text-xs text-foreground whitespace-pre-wrap line-clamp-6">{config.content}</p>
            </div>
          )}

          {!config.template_id && (
            <p className="text-xs text-amber-500">Selecione um template para configurar esta mensagem.</p>
          )}
        </div>
      )}

      {nodeType === "delay" && (
        <>
          <div className="flex gap-2">
            <div className="flex-1">
              <Label className="text-xs">Duração</Label>
              <Input
                type="number"
                value={config.duration || ""}
                onChange={(e) => set("duration", Number(e.target.value))}
                placeholder="5"
                className="h-8"
              />
            </div>
            <div className="flex-1">
              <Label className="text-xs">Unidade</Label>
              <Select value={config.unit || "minutes"} onValueChange={(v) => set("unit", v)}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="minutes">Minutos</SelectItem>
                  <SelectItem value="hours">Horas</SelectItem>
                  <SelectItem value="days">Dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Modo</Label>
            <Select value={config.wait_mode || "fixed"} onValueChange={(v) => set("wait_mode", v)}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">Tempo fixo</SelectItem>
                <SelectItem value="reply_or_timeout">Aguardar resposta (ou timeout)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {nodeType === "trigger" && (
        <>
          <div>
            <Label className="text-xs">Tipo de gatilho</Label>
            <Select value={config.trigger_type || "message_received"} onValueChange={(v) => set("trigger_type", v)}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="message_received">Mensagem recebida</SelectItem>
                <SelectItem value="keyword">Palavra-chave</SelectItem>
                <SelectItem value="after_campaign">Resposta de campanha</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {config.trigger_type === "keyword" && (
            <>
              <div>
                <Label className="text-xs">Palavra-chave</Label>
                <Input
                  value={config.keyword || ""}
                  onChange={(e) => set("keyword", e.target.value)}
                  placeholder="Ex: quero saber mais"
                  className="h-8"
                />
              </div>
              <div>
                <Label className="text-xs">Modo de comparação</Label>
                <Select value={config.match_mode || "contains"} onValueChange={(v) => set("match_mode", v)}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contains">Contém</SelectItem>
                    <SelectItem value="exact">Exato</SelectItem>
                    <SelectItem value="starts_with">Começa com</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {(config.trigger_type === "message_received" || config.trigger_type === "keyword" || !config.trigger_type) && (
            <>
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <div>
                  <Label className="text-xs">Modo de teste</Label>
                  <p className="text-[10px] text-muted-foreground">Só dispara para um número específico</p>
                </div>
                <Switch
                  checked={!!config.test_mode}
                  onCheckedChange={(v) => set("test_mode", v)}
                />
              </div>
              {config.test_mode && (
                <div>
                  <Label className="text-xs">Número de teste</Label>
                  <Input
                    value={config.test_phone || ""}
                    onChange={(e) => set("test_phone", e.target.value)}
                    placeholder="5511999999999"
                    className="h-8"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Apenas mensagens deste número irão ativar o fluxo
                  </p>
                </div>
              )}
            </>
          )}

          {config.trigger_type === "after_campaign" && (
            <div className="space-y-3">
              <div className="p-3 bg-muted/50 border border-border rounded-lg space-y-2">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    Este fluxo será ativado quando um lead responder a uma campanha vinculada.
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-xs">Vincular campanha</Label>
                <Select
                  value=""
                  onValueChange={async (campaignId) => {
                    const { error } = await supabase
                      .from("broadcast_campaigns")
                      .update({ flow_id: flowId } as any)
                      .eq("id", campaignId);
                    if (error) {
                      toast.error("Erro ao vincular campanha");
                    } else {
                      toast.success("Campanha vinculada!");
                      queryClient.invalidateQueries({ queryKey: ["broadcast-campaigns"] });
                    }
                  }}
                >
                  <SelectTrigger className="h-8"><SelectValue placeholder="Selecione uma campanha" /></SelectTrigger>
                  <SelectContent>
                    {campaigns
                      .filter((c: any) => !c.flow_id)
                      .map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} ({c.total_recipients} dest.)
                        </SelectItem>
                      ))}
                    {campaigns.filter((c: any) => !c.flow_id).length === 0 && (
                      <SelectItem value="__none" disabled>Nenhuma campanha disponível</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {(() => {
                const linkedCampaigns = campaigns.filter((c: any) => c.flow_id === flowId);
                if (linkedCampaigns.length > 0) {
                  return (
                    <div className="space-y-1">
                      <Label className="text-xs">Campanhas vinculadas</Label>
                      {linkedCampaigns.map((c: any) => (
                        <div key={c.id} className="flex items-center justify-between text-xs px-2 py-1.5 bg-background rounded border border-border">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">{c.name}</span>
                            <span className="text-muted-foreground">({c.total_recipients} dest.)</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 shrink-0"
                            onClick={async () => {
                              const { error } = await supabase
                                .from("broadcast_campaigns")
                                .update({ flow_id: null } as any)
                                .eq("id", c.id);
                              if (!error) {
                                toast.success("Campanha desvinculada");
                                queryClient.invalidateQueries({ queryKey: ["broadcast-campaigns"] });
                              }
                            }}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  );
                }
                return (
                  <p className="text-xs text-amber-500">Nenhuma campanha vinculada a este fluxo ainda.</p>
                );
              })()}

              <div>
                <Label className="text-xs">Delay antes de ativar (opcional)</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={config.delay_after || ""}
                    onChange={(e) => set("delay_after", Number(e.target.value))}
                    placeholder="0"
                    className="h-8 flex-1"
                  />
                  <Select value={config.delay_unit || "minutes"} onValueChange={(v) => set("delay_unit", v)}>
                    <SelectTrigger className="h-8 w-[100px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minutes">Min</SelectItem>
                      <SelectItem value="hours">Horas</SelectItem>
                      <SelectItem value="days">Dias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {(config.trigger_type === "message_received" || !config.trigger_type) && (
            <div>
              <Label className="text-xs">Filtro (opcional)</Label>
              <Input
                value={config.filter_keyword || ""}
                onChange={(e) => set("filter_keyword", e.target.value)}
                placeholder="Qualquer mensagem (vazio = todas)"
                className="h-8"
              />
            </div>
          )}

          <div>
            <Label className="text-xs">Descrição</Label>
            <Textarea
              value={config.description || ""}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Ponto de entrada do fluxo"
              rows={2}
            />
          </div>
        </>
      )}

      {/* Delete */}
      {nodeType !== "trigger" && (
        <Button
          variant="destructive"
          size="sm"
          className="w-full mt-4"
          onClick={() => onDelete(node.id)}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Remover Card
        </Button>
      )}
    </div>
  );
}
