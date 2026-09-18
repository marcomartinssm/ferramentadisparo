import { Search, MoreVertical, Upload, Download, Users, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Contact, ContactList } from "@/hooks/useContacts";

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

interface Props {
  contacts: Contact[];
  search: string;
  onSearchChange: (v: string) => void;
  selectedId: string | null;
  onSelect: (c: Contact) => void;
  onImport: () => void;
  onExport: () => void;
  onNewList: () => void;
  lists: ContactList[];
  activeListId: string | null;
  onListChange: (id: string | null) => void;
}

export default function ContactListPanel({
  contacts, search, onSearchChange, selectedId, onSelect, onImport, onExport, onNewList,
  lists, activeListId, onListChange,
}: Props) {
  const filtered = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.company || '').toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
  );

  // Count for "Geral" — we show contacts.length since when activeListId is null it's all contacts
  const totalCount = activeListId === null ? contacts.length : contacts.length;

  return (
    <div className="w-[400px] shrink-0 glass-card flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">
            Lista de contatos ({contacts.length})
          </span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onImport}>
              <Upload className="w-4 h-4 mr-2" /> Importar CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExport} disabled={contacts.length === 0}>
              <Download className="w-4 h-4 mr-2" /> Exportar CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onNewList}>
              <Users className="w-4 h-4 mr-2" /> Nova Lista
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* List tabs */}
      <div className="flex items-center gap-1.5 p-3 border-b border-border overflow-x-auto scrollbar-thin">
        <button
          onClick={() => onListChange(null)}
          className={cn(
            "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
            activeListId === null
              ? "bg-primary text-primary-foreground"
              : "bg-muted/50 text-muted-foreground hover:bg-muted"
          )}
        >
          Geral
        </button>
        {lists.map(l => (
          <button
            key={l.id}
            onClick={() => onListChange(l.id)}
            className={cn(
              "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
              activeListId === l.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            )}
          >
            {l.name} ({l.contact_count ?? 0})
          </button>
        ))}
        <button
          onClick={onNewList}
          className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-muted/50 text-muted-foreground hover:bg-muted transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar contato..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 bg-card border-border h-9 text-sm"
          />
        </div>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            {search ? "Nenhum contato encontrado" : "Nenhum contato cadastrado"}
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => onSelect(c)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 text-left transition-colors hover:bg-muted/30",
                  selectedId === c.id && "bg-primary/10 border-l-2 border-l-primary"
                )}
              >
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
                    {getInitials(c.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground font-mono truncate">{c.phone}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
