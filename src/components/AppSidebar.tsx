import { NavLink, useLocation } from "react-router-dom";
import {
  LogOut,
  LayoutDashboard, Users, Megaphone, Zap, FileText,
  Smartphone, ChevronLeft, GitBranch, HelpCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import viaIcon from "@/assets/icon-via.png";
import viaLogoWhite from "@/assets/logo-via-white.png";

const navGroups = [
  {
    label: "Dados",
    icon: LayoutDashboard,
    items: [
      { path: "/", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Automação",
    icon: Zap,
    items: [
      { path: "/campaigns", label: "Campanhas", icon: Megaphone },
      { path: "/messages", label: "Templates", icon: FileText },
      { path: "/flows", label: "Fluxos", icon: GitBranch },
      
    ],
  },
  {
    label: "Contatos",
    icon: Users,
    items: [
      { path: "/contacts", label: "Contatos", icon: Users },
    ],
  },
  {
    label: "Canais",
    icon: Smartphone,
    items: [
      { path: "/instances", label: "Canais de WhatsApp", icon: Smartphone },
    ],
  },
  {
    label: "Ajuda",
    icon: HelpCircle,
    items: [
      { path: "/help", label: "Ajuda", icon: HelpCircle },
    ],
  },
];

interface Props {
  collapsed: boolean;
  onToggle: () => void;
}

export default function AppSidebar({ collapsed, onToggle }: Props) {
  const location = useLocation();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300 z-50 backdrop-blur-xl",
        collapsed ? "w-[68px]" : "w-[240px]"
      )}>

      {/* Logo */}
      <div className="flex flex-col items-end justify-center px-4 min-h-16 py-3 border-b border-sidebar-border shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0 overflow-hidden">
            <img alt="Viver de IA" className="w-full h-full object-contain" src="/lovable-uploads/b677d082-d634-4f11-91cb-13ed415b12eb.png" />
          </div>
          {!collapsed &&
          <img src={viaLogoWhite} alt="Viver de IA" className="h-5 object-contain animate-slide-in" />
          }
        </div>
        {!collapsed &&
        <span className="text-[10px] font-medium text-muted-foreground tracking-wide uppercase mt-1.5 animate-slide-in text-right">
            Disparos WhatsApp API Oficial
          </span>
        }
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {navGroups.map((group, gi) => (
          <div key={group.label} className={cn(gi > 0 && "mt-4")}>
            {/* Group label */}
            {!collapsed ? (
              <div className="flex items-center gap-2 px-3 mb-1">
                <group.icon className="w-3.5 h-3.5 text-muted-foreground/70" />
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold select-none">
                  {group.label}
                </span>
              </div>
            ) : (
              gi > 0 && <div className="mx-3 mb-2 border-t border-sidebar-border" />
            )}

            {/* Sub-items */}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "sidebar-item",
                    !collapsed && "pl-4",
                    location.pathname === item.path && "active"
                  )}>
                  <item.icon className="w-[18px] h-[18px] shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="border-t border-sidebar-border p-2 space-y-0.5">
        <button
          onClick={() => supabase.auth.signOut()}
          className="sidebar-item w-full">
          <LogOut className="w-[18px] h-[18px] shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
        <button
          onClick={onToggle}
          className="sidebar-item w-full">
          <ChevronLeft
            className={cn(
              "w-[18px] h-[18px] shrink-0 transition-transform",
              collapsed && "rotate-180"
            )} />
          {!collapsed && <span>Recolher</span>}
        </button>
      </div>
    </aside>
  );
}
