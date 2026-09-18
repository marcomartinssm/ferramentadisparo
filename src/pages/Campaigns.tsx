import { useState, useMemo, useEffect } from "react";
import { Plus, Search, MoreVertical, Loader2, Megaphone, Eye, BarChart3, Copy, Trash2, Pencil } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBroadcasts, BroadcastCampaign } from "@/hooks/useBroadcasts";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink,
  PaginationNext, PaginationPrevious, PaginationEllipsis,
} from "@/components/ui/pagination";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import CampaignWizard from "@/components/broadcasts/CampaignWizard";
import CampaignDetails from "@/components/broadcasts/CampaignDetails";

const statusMap: Record<string, "active" | "paused" | "completed" | "draft" | "error"> = {
  processing: "active", sending: "active", paused: "paused",
  completed: "completed", draft: "draft", failed: "error",
  waiting: "paused", scheduled: "draft",
};

const tabFilters: Record<string, string[]> = {
  todos: [],
  executando: ["processing", "sending"],
  pausadas: ["paused"],
  cancelado: ["failed"],
  finalizadas: ["completed"],
  espera: ["waiting"],
  agendado: ["scheduled"],
  rascunho: ["draft"],
};

const ITEMS_PER_PAGE = 10;

const mockCampaigns: BroadcastCampaign[] = [
  {
    id: "mock-1",
    user_id: "00000000-0000-0000-0000-000000000000",
    name: "Promoção Black Friday 2026",
    message_template: "Olá {{nome}}, aproveite 50% de desconto!",
    message_type: "text",
    media_url: null,
    instance_id: "",
    instance_ids: [],
    delay_min_ms: 5000,
    delay_max_ms: 15000,
    batch_size: 10,
    delay_between_batches: 300,
    delay_between_batches_max: 300,
    rotation_strategy: "single",
    next_batch_at: null,
    column_mapping: {},
    custom_fields: [],
    status: "completed",
    total_recipients: 1250,
    sent_count: 1218,
    failed_count: 32,
    started_at: "2026-03-10T10:00:00Z",
    completed_at: "2026-03-10T14:30:00Z",
    created_at: "2026-03-10T09:00:00Z",
    updated_at: "2026-03-10T14:30:00Z",
    voice_profile_id: null,
    flow_id: null,
  },
  {
    id: "mock-2",
    user_id: "00000000-0000-0000-0000-000000000000",
    name: "Lançamento Produto Novo",
    message_template: "{{nome}}, conheça nosso novo produto!",
    message_type: "text",
    media_url: null,
    instance_id: "",
    instance_ids: [],
    delay_min_ms: 5000,
    delay_max_ms: 15000,
    batch_size: 10,
    delay_between_batches: 300,
    delay_between_batches_max: 300,
    rotation_strategy: "single",
    next_batch_at: "2026-03-12T15:00:00Z",
    column_mapping: {},
    custom_fields: [],
    status: "processing",
    total_recipients: 800,
    sent_count: 342,
    failed_count: 8,
    started_at: "2026-03-12T12:00:00Z",
    completed_at: null,
    created_at: "2026-03-12T11:00:00Z",
    updated_at: "2026-03-12T13:00:00Z",
    voice_profile_id: null,
    flow_id: null,
  },
];

export default function Campaigns() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("todos");
  const [currentPage, setCurrentPage] = useState(1);
  const { campaigns: realCampaigns, isLoading, duplicateCampaign, deleteCampaign } = useBroadcasts();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingDraft, setEditingDraft] = useState<BroadcastCampaign | null>(null);
  const [viewCampaign, setViewCampaign] = useState<BroadcastCampaign | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const campaigns = realCampaigns.length > 0 ? realCampaigns : mockCampaigns;

  useEffect(() => {
    if (viewCampaign) {
      const updated = realCampaigns.find(c => c.id === viewCampaign.id);
      if (updated && updated.status !== viewCampaign.status) {
        setViewCampaign(updated);
      }
    }
  }, [realCampaigns]);

  const filtered = useMemo(() => {
    let result = campaigns;
    const statusFilter = tabFilters[activeTab];
    if (statusFilter && statusFilter.length > 0) {
      result = result.filter(c => statusFilter.includes(c.status));
    }
    if (search) {
      result = result.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
    }
    return result;
  }, [campaigns, activeTab, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setCurrentPage(1);
  };

  const activeCount = campaigns.filter(c => ['processing', 'sending'].includes(c.status)).length;

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const [key, statuses] of Object.entries(tabFilters)) {
      counts[key] = statuses.length === 0 ? campaigns.length : campaigns.filter(c => statuses.includes(c.status)).length;
    }
    return counts;
  }, [campaigns]);

  if (wizardOpen || editingDraft) {
    return (
      <div className="fixed inset-0 z-50 bg-background">
        <CampaignWizard
          onClose={() => { setWizardOpen(false); setEditingDraft(null); }}
          onCampaignCreated={() => { setWizardOpen(false); setEditingDraft(null); }}
          editingCampaign={editingDraft}
        />
      </div>
    );
  }

  if (viewCampaign) {
    return (
      <div className="space-y-4 animate-fade-in-up">
        <CampaignDetails campaign={viewCampaign} onBack={() => setViewCampaign(null)} />
      </div>
    );
  }

  const renderPageNumbers = () => {
    const pages: React.ReactNode[] = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);

    if (start > 1) {
      pages.push(
        <PaginationItem key={1}><PaginationLink onClick={() => setCurrentPage(1)} isActive={currentPage === 1}>1</PaginationLink></PaginationItem>
      );
      if (start > 2) pages.push(<PaginationItem key="start-ellipsis"><PaginationEllipsis /></PaginationItem>);
    }

    for (let i = start; i <= end; i++) {
      pages.push(
        <PaginationItem key={i}><PaginationLink onClick={() => setCurrentPage(i)} isActive={currentPage === i}>{i}</PaginationLink></PaginationItem>
      );
    }

    if (end < totalPages) {
      if (end < totalPages - 1) pages.push(<PaginationItem key="end-ellipsis"><PaginationEllipsis /></PaginationItem>);
      pages.push(
        <PaginationItem key={totalPages}><PaginationLink onClick={() => setCurrentPage(totalPages)} isActive={currentPage === totalPages}>{totalPages}</PaginationLink></PaginationItem>
      );
    }

    return pages;
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Campanhas</h1>
          <p className="text-sm text-muted-foreground mt-1">{campaigns.length} campanhas · {activeCount} ativas</p>
        </div>
        <Button className="gap-2" onClick={() => setWizardOpen(true)}>
          <Plus className="w-4 h-4" /> Nova Campanha
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="bg-muted/50 h-auto flex-wrap gap-1 p-1">
          {[
            { value: "todos", label: "Todos" },
            { value: "executando", label: "Executando" },
            { value: "pausadas", label: "Pausadas" },
            { value: "cancelado", label: "Cancelado" },
            { value: "finalizadas", label: "Finalizadas" },
            { value: "espera", label: "Em Espera" },
            { value: "agendado", label: "Agendado" },
            { value: "rascunho", label: "Rascunho" },
          ].map(tab => (
            <TabsTrigger key={tab.value} value={tab.value} className="text-xs px-3 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              {tab.label} ({tabCounts[tab.value] ?? 0})
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar campanhas..." value={search} onChange={(e) => handleSearchChange(e.target.value)} className="pl-10 bg-card border-border" />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center p-8 border border-dashed border-border rounded-lg">
          <Megaphone className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground mb-2">{search || activeTab !== "todos" ? "Nenhuma campanha encontrada" : "Nenhuma campanha criada"}</p>
          {activeTab === "todos" && !search && (
            <Button variant="outline" size="sm" onClick={() => setWizardOpen(true)}><Plus className="w-4 h-4 mr-2" />Criar Campanha</Button>
          )}
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-border overflow-hidden bg-card">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Nome</th>
                  <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Tipo</th>
                  <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Data de Criação</th>
                  <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Data de Início</th>
                  <th className="text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Intervalo</th>
                  <th className="text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Status</th>
                  <th className="w-20"></th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((c) => {
                  const displayStatus = statusMap[c.status] || "draft";
                  const statusLabels: Record<string, string> = {
                    processing: "EXECUTANDO", sending: "EXECUTANDO", paused: "PAUSADA",
                    completed: "FINALIZADO", draft: "RASCUNHO", failed: "CANCELADO",
                    waiting: "EM ESPERA", scheduled: "AGENDADO",
                  };
                  const statusColors: Record<string, string> = {
                    processing: "text-primary", sending: "text-primary", paused: "text-warning",
                    completed: "text-success", draft: "text-muted-foreground", failed: "text-destructive",
                    waiting: "text-warning", scheduled: "text-accent",
                  };
                  return (
                    <tr
                      key={c.id}
                      className="border-b border-border/50 last:border-b-0 hover:bg-muted/20 transition-colors cursor-pointer"
                      onClick={() => c.status === 'draft' ? setEditingDraft(c) : setViewCampaign(c)}
                    >
                      <td className="px-4 py-3.5">
                        <span className="text-sm font-medium text-foreground">{c.name}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <img src="/lovable-uploads/ba741a41-a2de-483b-b086-7e214282fe22.png" alt="WhatsApp" className="w-5 h-5 rounded-full" />
                          <span className="text-sm text-muted-foreground">WhatsApp Web</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-sm text-muted-foreground">
                          {new Date(c.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}{' '}
                          {new Date(c.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-sm text-muted-foreground">
                          {c.started_at
                            ? `${new Date(c.started_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${new Date(c.started_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                            : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="text-sm text-muted-foreground">Todos os dias</span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`text-xs font-bold uppercase tracking-wide ${statusColors[c.status] || 'text-muted-foreground'}`}>
                          {statusLabels[c.status] || c.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1 justify-end">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setViewCampaign(c)}>
                            <BarChart3 className="w-4 h-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setViewCampaign(c)}>
                                <Eye className="w-4 h-4 mr-2" />Visualizar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setViewCampaign(c)}>
                                <BarChart3 className="w-4 h-4 mr-2" />Estatísticas
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => duplicateCampaign.mutate(c)}>
                                <Copy className="w-4 h-4 mr-2" />Duplicar
                              </DropdownMenuItem>
                              {c.status === 'draft' && (
                                <DropdownMenuItem onClick={() => setEditingDraft(c)}>
                                  <Pencil className="w-4 h-4 mr-2" />Continuar edição
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteId(c.id)}>
                                <Trash2 className="w-4 h-4 mr-2" />Remover
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted-foreground">
                Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} de {filtered.length}
              </p>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} />
                  </PaginationItem>
                  {renderPageNumbers()}
                  <PaginationItem>
                    <PaginationNext onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"} />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover campanha?</AlertDialogTitle>
            <AlertDialogDescription>Essa ação é irreversível. A campanha e todos os dados associados serão removidos permanentemente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteId) { deleteCampaign.mutate(deleteId); setDeleteId(null); } }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
