import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, FileText, CheckCircle, Clock, XCircle, Pencil, Trash2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

type MetaTemplate = Tables<"meta_templates">;

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Rascunho", variant: "secondary" },
  PENDING: { label: "Pendente", variant: "outline" },
  APPROVED: { label: "Aprovado", variant: "default" },
  REJECTED: { label: "Rejeitado", variant: "destructive" },
};

const CATEGORY_MAP: Record<string, string> = {
  MARKETING: "Marketing",
  UTILITY: "Utilidade",
  AUTHENTICATION: "Autenticação",
};

export default function Messages() {
  const navigate = useNavigate();
  const location = useLocation();
  const [templates, setTemplates] = useState<MetaTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchTemplates = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("meta_templates")
      .select("*")
      .order("created_at", { ascending: false });
    setTemplates(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchTemplates();
  }, [location.key]);

  // Polling: sync pending template statuses with Meta every 30s
  useEffect(() => {
    const sync = () => {
      supabase.functions.invoke("sync-template-status").catch(console.error);
    };
    sync(); // run once immediately
    const interval = setInterval(sync, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("meta-templates-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "meta_templates" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setTemplates((prev) => [payload.new as MetaTemplate, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            const newT = payload.new as MetaTemplate;
            setTemplates((prev) => {
              const old = prev.find((t) => t.id === newT.id);
              if (old && old.status !== newT.status) {
                if (newT.status === "APPROVED") toast.success(`Template "${newT.name}" aprovado! ✅`);
                else if (newT.status === "REJECTED") toast.error(`Template "${newT.name}" rejeitado.`);
              }
              return prev.map((t) => (t.id === newT.id ? newT : t));
            });
          } else if (payload.eventType === "DELETE") {
            setTemplates((prev) => prev.filter((t) => t.id !== (payload.old as MetaTemplate).id));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await supabase.functions.invoke("sync-template-status");
      await fetchTemplates();
      toast.success("Status dos templates sincronizado!");
    } catch {
      toast.error("Erro ao sincronizar status");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("meta_templates").delete().eq("id", id);
    if (error) { toast.error("Erro ao deletar template"); return; }
    toast.success("Template deletado");
  };

  const total = templates.length;
  const approved = templates.filter((t) => t.status === "APPROVED").length;
  const pending = templates.filter((t) => t.status === "PENDING" || t.status === "draft").length;
  const rejected = templates.filter((t) => t.status === "REJECTED").length;

  const stats = [
    { label: "Total", value: total, icon: FileText, color: "text-foreground" },
    { label: "Aprovados", value: approved, icon: CheckCircle, color: "text-success" },
    { label: "Pendentes", value: pending, icon: Clock, color: "text-warning" },
    { label: "Rejeitados", value: rejected, icon: XCircle, color: "text-destructive" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Templates</h1>
          <p className="text-sm text-muted-foreground">Gerencie seus templates de WhatsApp</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate("/templates/create")} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Template
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{loading ? "—" : stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Seus Templates</CardTitle>
          <Button variant="outline" size="sm" onClick={handleSync} disabled={isSyncing} className="gap-1.5">
            <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
            Sincronizar
          </Button>
        </CardHeader>
        <CardHeader className="pt-0">
          {!loading && templates.length === 0 && (
            <CardDescription>Nenhum template criado ainda. Comece criando seu primeiro!</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : templates.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Button variant="outline" onClick={() => navigate("/templates/create")} className="gap-2">
                <Plus className="h-4 w-4" />
                Criar primeiro template
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Idioma</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((t) => {
                  const status = STATUS_MAP[t.status] ?? { label: t.status, variant: "outline" as const };
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell>{CATEGORY_MAP[t.category] ?? t.category}</TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell>{t.language}</TableCell>
                      <TableCell>{t.validation_score != null ? `${t.validation_score}%` : "—"}</TableCell>
                      <TableCell>{format(new Date(t.created_at), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                      <TableCell className="flex gap-1">
                        {t.status === 'draft' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1.5 h-7 text-xs"
                            onClick={() => navigate(`/templates/${t.id}/edit`)}
                          >
                            <Pencil className="h-3 w-3" />
                            Continuar edição
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1.5 h-7 text-xs"
                            onClick={() => navigate(`/templates/${t.id}/edit`)}
                          >
                            <Pencil className="h-3 w-3" />
                            Editar
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 h-7 text-xs text-destructive"
                          onClick={() => handleDelete(t.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
