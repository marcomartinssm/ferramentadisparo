import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useContacts, Contact } from "@/hooks/useContacts";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import ContactImportDialog from "@/components/contacts/ContactImportDialog";
import ContactListPanel from "@/components/contacts/ContactListPanel";
import ContactDetailPanel from "@/components/contacts/ContactDetailPanel";
import PhoneInput from "@/components/contacts/PhoneInput";
import { splitPhone } from "@/lib/countries";

/* ── Mock contacts (visual fallback when DB is empty) ── */
const MOCK_CONTACTS: Contact[] = [
  { id: "mock-1", name: "Kaique Otavio", phone: "+55 11 95821 7530", company: "TechNova", city: "São Paulo", status: "interessado", score: 85, tags: ["lead", "evento"], is_blacklisted: false, whatsapp_valid: true, created_at: "2026-03-01T10:00:00Z", updated_at: "2026-03-10T10:00:00Z", list_ids: [] },
  { id: "mock-2", name: "Ana Carolina", phone: "+55 21 99876 5432", company: "Criativa Digital", city: "Rio de Janeiro", status: "novo", score: 40, tags: ["inbound"], is_blacklisted: false, whatsapp_valid: true, created_at: "2026-03-02T10:00:00Z", updated_at: "2026-03-10T10:00:00Z", list_ids: [] },
  { id: "mock-3", name: "Rafael Santos", phone: "+55 16 99313 6870", company: "Agro+", city: "Ribeirão Preto", status: "convertido", score: 92, tags: ["vip", "agro"], is_blacklisted: false, whatsapp_valid: true, created_at: "2026-03-03T10:00:00Z", updated_at: "2026-03-10T10:00:00Z", list_ids: [] },
  { id: "mock-4", name: "Gerlisse Pacífico", phone: "+55 11 98532 7693", company: "BeautyPro", city: "São Paulo", status: "respondeu", score: 65, tags: ["beauty"], is_blacklisted: false, whatsapp_valid: null, created_at: "2026-03-04T10:00:00Z", updated_at: "2026-03-10T10:00:00Z", list_ids: [] },
  { id: "mock-5", name: "Pedro Almeida", phone: "+55 31 98765 4321", company: "FinanceUp", city: "Belo Horizonte", status: "disparado", score: 30, tags: ["finance", "cold"], is_blacklisted: false, whatsapp_valid: true, created_at: "2026-03-05T10:00:00Z", updated_at: "2026-03-10T10:00:00Z", list_ids: [] },
];

export default function Contacts() {
  const [search, setSearch] = useState("");
  const [activeList, setActiveList] = useState<string | null>(null);
  const { contacts: dbContacts, lists, isLoading, addContact, updateContact, deleteContact, addList } = useContacts(activeList);

  const contacts = dbContacts.length > 0 ? dbContacts : MOCK_CONTACTS;

  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addListDialogOpen, setAddListDialogOpen] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formDialCode, setFormDialCode] = useState("+55");
  const [formCompany, setFormCompany] = useState("");
  const [formCity, setFormCity] = useState("");
  const [formTags, setFormTags] = useState("");
  const [formListIds, setFormListIds] = useState<string[]>([]);
  const [formListName, setFormListName] = useState("");
  const [formListSource, setFormListSource] = useState("manual");

  const toggleFormList = (listId: string) => {
    setFormListIds(prev =>
      prev.includes(listId) ? prev.filter(id => id !== listId) : [...prev, listId]
    );
  };

  const openAddDialog = () => {
    setFormName(""); setFormPhone(""); setFormDialCode("+55"); setFormCompany(""); setFormCity(""); setFormTags(""); setFormListIds([]);
    setEditContact(null);
    setAddDialogOpen(true);
  };

  const openEditDialog = (c: Contact) => {
    const { dialCode, phone: phoneNum } = splitPhone(c.phone);
    setFormName(c.name); setFormPhone(phoneNum); setFormDialCode(dialCode); setFormCompany(c.company); setFormCity(c.city);
    setFormTags((c.tags || []).join(", ")); setFormListIds(c.list_ids || []);
    setEditContact(c);
    setAddDialogOpen(true);
  };

  const handleSaveContact = async () => {
    if (!formName.trim() || !formPhone.trim()) { toast.error("Nome e telefone são obrigatórios"); return; }
    const fullPhone = formDialCode.replace("+", "") + formPhone.replace(/\D/g, "");
    const tags = formTags.split(",").map(t => t.trim()).filter(Boolean);
    if (editContact) {
      await updateContact.mutateAsync({ id: editContact.id, name: formName, phone: fullPhone, company: formCompany, city: formCity, tags, list_ids: formListIds });
    } else {
      await addContact.mutateAsync({ name: formName, phone: fullPhone, company: formCompany, city: formCity, tags, list_ids: formListIds, status: "novo", score: 0 });
    }
    setAddDialogOpen(false);
  };

  const handleCreateList = async () => {
    if (!formListName.trim()) { toast.error("Nome da lista obrigatório"); return; }
    await addList.mutateAsync({ name: formListName, source: formListSource });
    setAddListDialogOpen(false);
    setFormListName(""); setFormListSource("manual");
  };

  const handleExportCsv = () => {
    const header = "nome,telefone,empresa,cidade,status,score,tags";
    const rows = contacts.map(c =>
      `"${c.name}","${c.phone}","${c.company}","${c.city}","${c.status}",${c.score},"${(c.tags || []).join(';')}"`
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "contatos.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado");
  };

  // Total contacts count (for "Geral" tab)
  const { contacts: allContacts } = useContacts(null);
  const totalCount = allContacts.length > 0 ? allContacts.length : MOCK_CONTACTS.length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full animate-fade-in-up">
      {/* Top header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contatos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{totalCount} contatos · {lists.length} listas</p>
        </div>
        <Button className="gap-2" onClick={openAddDialog}>
          <Plus className="w-4 h-4" /> CRIAR
        </Button>
      </div>

      {/* Split panel */}
      <div className="flex gap-4 flex-1 min-h-0">
        <ContactListPanel
          contacts={contacts}
          search={search}
          onSearchChange={setSearch}
          selectedId={selectedContact?.id ?? null}
          onSelect={setSelectedContact}
          onImport={() => setImportDialogOpen(true)}
          onExport={handleExportCsv}
          onNewList={() => { setFormListName(""); setFormListSource("manual"); setAddListDialogOpen(true); }}
          lists={lists}
          activeListId={activeList}
          onListChange={setActiveList}
        />
        <ContactDetailPanel
          contact={selectedContact}
          onEdit={openEditDialog}
          onDelete={(id) => setDeleteId(id)}
          lists={lists}
        />
      </div>

      {/* ── Dialogs ── */}

      {/* Add/Edit Contact */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editContact ? "Editar Contato" : "Novo Contato"}</DialogTitle>
            <DialogDescription>{editContact ? "Atualize os dados do contato" : "Adicione um novo contato à base"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Nome *</Label><Input placeholder="Nome completo" value={formName} onChange={e => setFormName(e.target.value)} /></div>
            <div className="space-y-1.5">
              <Label>Telefone *</Label>
              <PhoneInput dialCode={formDialCode} phone={formPhone} onDialCodeChange={setFormDialCode} onPhoneChange={setFormPhone} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Empresa</Label><Input placeholder="Empresa" value={formCompany} onChange={e => setFormCompany(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Cidade</Label><Input placeholder="Cidade" value={formCity} onChange={e => setFormCity(e.target.value)} /></div>
            </div>
            <div className="space-y-1.5"><Label>Tags <span className="text-xs text-muted-foreground">(separadas por vírgula)</span></Label><Input placeholder="tag1, tag2" value={formTags} onChange={e => setFormTags(e.target.value)} /></div>
            {lists.length > 0 && (
              <div className="space-y-2">
                <Label>Listas</Label>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {lists.map(l => (
                    <label key={l.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/30 cursor-pointer">
                      <Checkbox
                        checked={formListIds.includes(l.id)}
                        onCheckedChange={() => toggleFormList(l.id)}
                      />
                      <span className="text-sm text-foreground">{l.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setAddDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSaveContact} disabled={addContact.isPending || updateContact.isPending}>
                {(addContact.isPending || updateContact.isPending) && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {editContact ? "Salvar" : "Adicionar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* New List */}
      <Dialog open={addListDialogOpen} onOpenChange={setAddListDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nova Lista</DialogTitle>
            <DialogDescription>Crie uma lista para organizar seus contatos</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Nome da Lista *</Label><Input placeholder="Ex: Leads Evento 2026" value={formListName} onChange={e => setFormListName(e.target.value)} /></div>
            <div className="space-y-1.5">
              <Label>Origem</Label>
              <Select value={formListSource} onValueChange={setFormListSource}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="importacao">Importação</SelectItem>
                  <SelectItem value="misto">Misto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setAddListDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreateList} disabled={addList.isPending}>
                {addList.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Criar Lista
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import CSV */}
      <ContactImportDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} lists={lists} activeListId={activeList} />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover contato?</AlertDialogTitle>
            <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteId) { deleteContact.mutate(deleteId); setDeleteId(null); setSelectedContact(null); } }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
