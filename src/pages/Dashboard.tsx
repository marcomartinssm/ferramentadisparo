import {
  Radio,
  Wifi,
  WifiOff,
  Users,
  Play,
  Send,
  Calendar,
  Pause,
  CheckCircle,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import StatCard from "@/components/StatCard";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { format, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";

const mockChartData = [
  { date: "08/06", envios: 0, entregues: 0, lidas: 0 },
  { date: "22/06", envios: 200, entregues: 180, lidas: 50 },
  { date: "06/07", envios: 800, entregues: 720, lidas: 300 },
  { date: "20/07", envios: 400, entregues: 350, lidas: 150 },
  { date: "03/08", envios: 1200, entregues: 1050, lidas: 500 },
  { date: "17/08", envios: 600, entregues: 520, lidas: 200 },
  { date: "31/08", envios: 2400, entregues: 2100, lidas: 900 },
  { date: "14/09", envios: 1800, entregues: 1600, lidas: 700 },
  { date: "28/09", envios: 1000, entregues: 880, lidas: 400 },
  { date: "12/10", envios: 1500, entregues: 1350, lidas: 600 },
  { date: "26/10", envios: 700, entregues: 620, lidas: 280 },
  { date: "09/11", envios: 2200, entregues: 1950, lidas: 850 },
  { date: "23/11", envios: 1600, entregues: 1400, lidas: 620 },
  { date: "07/12", envios: 900, entregues: 800, lidas: 350 },
  { date: "10/12", envios: 500, entregues: 440, lidas: 200 },
];

function formatNumber(n: number): string {
  return n.toLocaleString("pt-BR");
}

const renderLegend = () => {
  const items = [
    { label: "Envios", color: "hsl(var(--accent))" },
    { label: "Entregues", color: "hsl(215, 20.2%, 55%)" },
    { label: "Lidas", color: "hsl(var(--primary))" },
  ];
  return (
    <div className="flex items-center justify-center gap-6 pt-4">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
          <span className="text-xs text-muted-foreground">{item.label}</span>
        </div>
      ))}
    </div>
  );
};

export default function Dashboard() {
  // Query: WhatsApp instances
  const { data: instances } = useQuery({
    queryKey: ["dashboard-instances"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_instances")
        .select("id, status, is_active");
      if (error) throw error;
      return data ?? [];
    },
  });

  // Query: Contacts count
  const { data: contactCount } = useQuery({
    queryKey: ["dashboard-contacts-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("contacts")
        .select("*", { head: true, count: "exact" });
      if (error) throw error;
      return count ?? 0;
    },
  });

  // Query: Campaign chart data from broadcast_recipients
  const { data: chartData } = useQuery({
    queryKey: ["dashboard-campaign-chart"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("broadcast_recipients")
        .select("status, sent_at")
        .not("sent_at", "is", null);
      if (error) throw error;
      if (!data || data.length === 0) return null;

      // Group by biweekly period
      const groups: Record<string, { envios: number; entregues: number; lidas: number }> = {};
      data.forEach((r) => {
        const week = startOfWeek(new Date(r.sent_at!), { weekStartsOn: 1 });
        // Group into 2-week buckets
        const biweekTs = Math.floor(week.getTime() / (14 * 86400000));
        const key = format(new Date(biweekTs * 14 * 86400000), "dd/MM");
        if (!groups[key]) groups[key] = { envios: 0, entregues: 0, lidas: 0 };
        groups[key].envios++;
        if (r.status === "delivered" || r.status === "read") groups[key].entregues++;
        if (r.status === "read") groups[key].lidas++;
      });

      return Object.entries(groups)
        .map(([date, vals]) => ({ date, ...vals }))
        .sort((a, b) => a.date.localeCompare(b.date));
    },
  });

  // Query: Broadcast campaigns for stats + top 5
  const { data: campaigns } = useQuery({
    queryKey: ["dashboard-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("broadcast_campaigns")
        .select("id, name, status, sent_count");
      if (error) throw error;
      return data ?? [];
    },
  });

  const allInstances = instances ?? [];
  const totalCreated = allInstances.length;
  const totalConnected = allInstances.filter((i) => i.status === "connected").length;
  const totalDisconnected = totalCreated - totalConnected;
  const totalContacts = contactCount ?? 0;

  const displayChart = chartData && chartData.length > 0 ? chartData : mockChartData;

  const allCampaigns = campaigns ?? [];
  const campaignTotal = allCampaigns.length;
  const campaignSending = allCampaigns.filter((c) => c.status === "sending").length;
  const campaignScheduled = allCampaigns.filter((c) => c.status === "scheduled").length;
  const campaignPaused = allCampaigns.filter((c) => c.status === "paused").length;
  const campaignCompleted = allCampaigns.filter((c) => c.status === "completed").length;
  const top5Campaigns = [...allCampaigns]
    .sort((a, b) => (b.sent_count ?? 0) - (a.sent_count ?? 0))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboards</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Acompanhe os indicadores e resultados das suas operações
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="bg-transparent border-b border-border rounded-none p-0 h-auto gap-0">
          {[
            { value: "overview", label: "Visão geral" },
            { value: "campaigns", label: "Campanhas" },
            { value: "triggers", label: "Gatilhos" },
            { value: "flows", label: "Fluxos" },
          ].map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary px-4 py-2.5 text-sm"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          {/* Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={Radio}
              label="Canais Criados"
              value={formatNumber(totalCreated)}
              iconColor="bg-accent/15"
            />
            <StatCard
              icon={Wifi}
              label="Canais Conectados"
              value={formatNumber(totalConnected)}
              iconColor="bg-primary/15"
            />
            <StatCard
              icon={WifiOff}
              label="Canais Desconectados"
              value={formatNumber(totalDisconnected)}
              iconColor="bg-muted"
            />
            <StatCard
              icon={Users}
              label="Total de Contatos"
              value={formatNumber(totalContacts)}
              iconColor="bg-accent/15"
            />
          </div>

          {/* Campaign Chart */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Campanhas</h3>
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={displayChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(217.2, 32.6%, 14%)" />
                <XAxis dataKey="date" stroke="hsl(215, 20.2%, 55%)" fontSize={11} />
                <YAxis stroke="hsl(215, 20.2%, 55%)" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(217.2, 32.6%, 8%)",
                    border: "1px solid hsl(217.2, 32.6%, 14%)",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "hsl(210, 40%, 98%)",
                  }}
                />
                <Bar dataKey="envios" fill="hsl(263, 70%, 50%)" radius={[4, 4, 0, 0]} opacity={0.85} barSize={20} />
                <Line type="monotone" dataKey="entregues" stroke="hsl(215, 20.2%, 55%)" strokeWidth={2} dot={{ r: 3, fill: "hsl(215, 20.2%, 55%)" }} />
                <Line type="monotone" dataKey="lidas" stroke="hsl(187, 85%, 53%)" strokeWidth={2} dot={{ r: 3, fill: "hsl(187, 85%, 53%)" }} />
                <Legend content={renderLegend} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Campaign Stats + TOP 5 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left: Campaign stat cards */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Campanhas</h3>
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  icon={Send}
                  label="Total"
                  value={formatNumber(campaignTotal)}
                  iconColor="bg-accent/15"
                />
                <StatCard
                  icon={Play}
                  label="Executando"
                  value={formatNumber(campaignSending)}
                  iconColor="bg-blue-500/15"
                />
                <StatCard
                  icon={Calendar}
                  label="Agendadas"
                  value={formatNumber(campaignScheduled)}
                  iconColor="bg-blue-500/15"
                />
                <StatCard
                  icon={Pause}
                  label="Pausadas"
                  value={formatNumber(campaignPaused)}
                  iconColor="bg-muted"
                />
              </div>
              <StatCard
                icon={CheckCircle}
                label="Finalizadas"
                value={formatNumber(campaignCompleted)}
                iconColor="bg-primary/15"
              />
            </div>

            {/* Right: TOP 5 table */}
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="px-2 py-0.5 rounded-full bg-accent/15 text-accent text-[10px] font-bold uppercase tracking-wider">
                  TOP 5
                </span>
                <h3 className="text-sm font-semibold text-foreground">Mais envios</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground text-xs border-b border-border">
                    <th className="text-left py-2 font-medium">#</th>
                    <th className="text-left py-2 font-medium">Campanha</th>
                    <th className="text-right py-2 font-medium">Envios</th>
                  </tr>
                </thead>
                <tbody>
                  {top5Campaigns.length > 0 ? (
                    top5Campaigns.map((c, i) => (
                      <tr
                        key={c.id}
                        className={i % 2 === 0 ? "bg-muted/20" : ""}
                      >
                        <td className="py-2.5 px-1 text-muted-foreground font-medium">
                          {i + 1}º
                        </td>
                        <td className="py-2.5 text-foreground truncate max-w-[200px]">
                          {c.name}
                        </td>
                        <td className="py-2.5 text-right text-foreground font-medium">
                          {formatNumber(c.sent_count ?? 0)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-muted-foreground">
                        Nenhuma campanha encontrada
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="campaigns" className="mt-6">
          <div className="glass-card p-8 text-center text-muted-foreground text-sm">
            Dados detalhados de campanhas em breve.
          </div>
        </TabsContent>

        <TabsContent value="triggers" className="mt-6">
          <div className="glass-card p-8 text-center text-muted-foreground text-sm">
            Dados de gatilhos em breve.
          </div>
        </TabsContent>

        <TabsContent value="flows" className="mt-6">
          <div className="glass-card p-8 text-center text-muted-foreground text-sm">
            Dados de fluxos em breve.
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
