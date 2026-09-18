import { Edit, Trash2, Tag, Phone, Building2, MapPin, TrendingUp, User, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { Contact, ContactList } from "@/hooks/useContacts";

const statusColors: Record<string, string> = {
  novo: "bg-info/15 text-info",
  disparado: "bg-warning/15 text-warning",
  respondeu: "bg-primary/15 text-primary",
  interessado: "bg-success/15 text-success",
  convertido: "bg-success/15 text-success",
  optout: "bg-muted text-muted-foreground",
  bloqueado: "bg-destructive/15 text-destructive",
};

const statusLabels: Record<string, string> = {
  novo: "Novo", disparado: "Disparado", respondeu: "Respondeu",
  interessado: "Interessado", convertido: "Convertido", optout: "Opt-out", bloqueado: "Bloqueado",
};

function getInitials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
}

interface Props {
  contact: Contact | null;
  onEdit: (c: Contact) => void;
  onDelete: (id: string) => void;
  lists?: ContactList[];
}

export default function ContactDetailPanel({ contact, onEdit, onDelete, lists = [] }: Props) {
  if (!contact) {
    return (
      <div className="flex-1 flex items-center justify-center glass-card">
        <div className="text-center space-y-2">
          <User className="w-12 h-12 mx-auto text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm">Selecione um contato ao lado para ver os detalhes</p>
        </div>
      </div>
    );
  }

  const contactLists = lists.filter(l => (contact.list_ids || []).includes(l.id));

  const rows: { icon: React.ReactNode; label: string; value: string }[] = [
    { icon: <Phone className="w-4 h-4" />, label: "Telefone", value: contact.phone },
    { icon: <Building2 className="w-4 h-4" />, label: "Empresa", value: contact.company || "—" },
    { icon: <MapPin className="w-4 h-4" />, label: "Cidade", value: contact.city || "—" },
  ];

  return (
    <div className="flex-1 glass-card overflow-auto">
      {/* Header */}
      <div className="p-6 border-b border-border flex items-start gap-4">
        <Avatar className="h-14 w-14 shrink-0">
          <AvatarFallback className="bg-primary/15 text-primary text-lg font-bold">
            {getInitials(contact.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-foreground truncate">{contact.name}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className={cn("badge-status text-xs", statusColors[contact.status] || "bg-muted text-muted-foreground")}>
              {statusLabels[contact.status] || contact.status}
            </span>
            <span className={cn(
              "text-sm font-bold",
              contact.score >= 80 ? "text-success" : contact.score >= 50 ? "text-warning" : "text-destructive"
            )}>
              <TrendingUp className="w-3.5 h-3.5 inline mr-0.5" />
              {contact.score}
            </span>
          </div>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onEdit(contact)}>
            <Edit className="w-3.5 h-3.5" /> Editar
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive" onClick={() => onDelete(contact.id)}>
            <Trash2 className="w-3.5 h-3.5" /> Remover
          </Button>
        </div>
      </div>

      {/* Info rows */}
      <div className="p-6 space-y-4">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-3">
            <span className="text-muted-foreground">{r.icon}</span>
            <div>
              <p className="text-xs text-muted-foreground">{r.label}</p>
              <p className="text-sm text-foreground font-medium">{r.value}</p>
            </div>
          </div>
        ))}

        {/* Lists */}
        {contactLists.length > 0 && (
          <div className="pt-2">
            <p className="text-xs text-muted-foreground mb-2">Listas</p>
            <div className="flex gap-1.5 flex-wrap">
              {contactLists.map((l) => (
                <span key={l.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-primary/10 text-primary">
                  <List className="w-2.5 h-2.5" />{l.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        {(contact.tags || []).length > 0 && (
          <div className="pt-2">
            <p className="text-xs text-muted-foreground mb-2">Tags</p>
            <div className="flex gap-1.5 flex-wrap">
              {contact.tags.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-muted text-muted-foreground">
                  <Tag className="w-2.5 h-2.5" />{t}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
