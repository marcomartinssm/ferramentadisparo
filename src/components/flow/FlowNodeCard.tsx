import { Handle, Position, type NodeProps, useReactFlow } from "@xyflow/react";
import { MessageSquare, Clock, Play, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const iconMap: Record<string, { icon: any; accent: string; iconBg: string; label: string; borderAccent: string }> = {
  trigger: { icon: Play, accent: "text-emerald-400", iconBg: "bg-emerald-500", label: "Início", borderAccent: "border-l-emerald-500" },
  message: { icon: MessageSquare, accent: "text-blue-400", iconBg: "bg-blue-500", label: "Mensagem", borderAccent: "border-l-blue-500" },
  delay: { icon: Clock, accent: "text-amber-400", iconBg: "bg-amber-500", label: "Intervalo", borderAccent: "border-l-amber-500" },
};

export default function FlowNodeCard({ id, data, selected }: NodeProps) {
  const nodeType = (data as any).type || "message";
  const config = (data as any).config || {};
  const info = iconMap[nodeType] || iconMap.message;
  const Icon = info.icon;
  const [hovered, setHovered] = useState(false);
  const { deleteElements, getEdges } = useReactFlow();

  const triggerLabels: Record<string, string> = {
    message_received: "Mensagem recebida",
    keyword: `Keyword: ${config.keyword || "..."}`,
    after_campaign: "Após campanha",
    manual: "Manual",
  };

  const subtitle =
    config.label ||
    (nodeType === "trigger" ? triggerLabels[config.trigger_type || "message_received"] : "") ||
    config.content?.substring(0, 40) ||
    (nodeType === "delay" ? `${config.duration || "?"} ${config.unit || "min"}` : "") ||
    info.label;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (nodeType === "trigger") return;
    const connectedEdges = getEdges().filter(edge => edge.source === id || edge.target === id);
    deleteElements({ nodes: [{ id }], edges: connectedEdges });
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card shadow-sm min-w-[190px] max-w-[240px] transition-all relative group border-l-[3px]",
        info.borderAccent,
        selected && "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-md"
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {hovered && nodeType !== "trigger" && (
        <button
          onClick={handleDelete}
          className="absolute -top-2 -right-2 z-10 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-md hover:scale-110 transition-transform"
        >
          <X className="w-3 h-3" />
        </button>
      )}
      {nodeType !== "trigger" && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background"
        />
      )}

      <div className="px-3 py-3 flex items-center gap-2.5">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", info.iconBg)}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest leading-none mb-1">{info.label}</p>
          <p className="text-sm font-medium text-foreground truncate leading-tight">{subtitle}</p>
        </div>
      </div>

      {nodeType === "delay" ? (
        <>
          <Handle type="source" position={Position.Bottom} id="replied"
            className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-background" style={{ left: '30%' }} />
          <Handle type="source" position={Position.Bottom} id="timeout"
            className="!w-3 !h-3 !bg-amber-500 !border-2 !border-background" style={{ left: '70%' }} />
        </>
      ) : (nodeType === "message") && config.wait_for_reply ? (
        <>
          <Handle type="source" position={Position.Bottom} id="default"
            className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-background" style={{ left: '30%' }} />
          <Handle type="source" position={Position.Bottom} id="timeout"
            className="!w-3 !h-3 !bg-amber-500 !border-2 !border-background" style={{ left: '70%' }} />
        </>
      ) : (
        <Handle type="source" position={Position.Bottom}
          className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background" />
      )}
    </div>
  );
}
