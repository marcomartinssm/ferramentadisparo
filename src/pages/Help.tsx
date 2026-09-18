import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { GitBranch, BookOpen, Upload, LayoutDashboard, Megaphone, Users, FileText, Smartphone } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { flowsGuide } from "@/data/help/flows-guide";
import { csvImportGuide } from "@/data/help/csv-import-guide";
import { dashboardGuide } from "@/data/help/dashboard-guide";
import { campaignsGuide } from "@/data/help/campaigns-guide";
import { contactsGuide } from "@/data/help/contacts-guide";
import { templatesGuide } from "@/data/help/templates-guide";

import { instancesGuide } from "@/data/help/instances-guide";

interface GuideItem {
  id: string;
  label: string;
  icon: React.ElementType;
  content: string;
}

const guides: GuideItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, content: dashboardGuide },
  { id: "campaigns", label: "Campanhas", icon: Megaphone, content: campaignsGuide },
  { id: "contacts", label: "Contatos", icon: Users, content: contactsGuide },
  { id: "csv-import", label: "Importação CSV", icon: Upload, content: csvImportGuide },
  { id: "templates", label: "Templates", icon: FileText, content: templatesGuide },
  { id: "flows", label: "Construtor de Fluxos", icon: GitBranch, content: flowsGuide },
  
  { id: "instances", label: "Canais de WhatsApp", icon: Smartphone, content: instancesGuide },
];

export default function Help() {
  const [searchParams] = useSearchParams();
  const guideParam = searchParams.get("guide");
  const initialGuide = guides.find((g) => g.id === guideParam)?.id || guides[0].id;
  const [activeGuide, setActiveGuide] = useState(initialGuide);

  useEffect(() => {
    if (guideParam && guides.some((g) => g.id === guideParam)) {
      setActiveGuide(guideParam);
    }
  }, [guideParam]);
  const current = guides.find((g) => g.id === activeGuide)!;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-primary" />
          Central de Ajuda
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Documentação e guias de uso do sistema
        </p>
      </div>

      <div className="flex gap-6 items-start">
        {/* Sidebar de guias */}
        <Card className="w-[240px] shrink-0">
          <CardContent className="p-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2">
              Guias
            </p>
            {guides.map((guide) => (
              <button
                key={guide.id}
                onClick={() => setActiveGuide(guide.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors text-left",
                  activeGuide === guide.id
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <guide.icon className="w-4 h-4 shrink-0" />
                {guide.label}
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Conteúdo do guia */}
        <Card className="flex-1 min-w-0">
          <ScrollArea className="h-[calc(100vh-200px)]">
            <CardContent className="help-guide-content p-8">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{current.content}</ReactMarkdown>
            </CardContent>
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
}
