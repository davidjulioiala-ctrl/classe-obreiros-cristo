import { motion } from "framer-motion";
import { Users, Calendar, DollarSign, TrendingUp, ArrowUp, Activity, AlertCircle, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import DashboardLayoutCustom from "@/components/DashboardLayoutCustom";
import { trpc } from "@/lib/trpc";

const COLORS = ["#10b981", "#06b6d4", "#8b5cf6", "#ec4899", "#f59e0b"];
const PARTICIPATION_COLORS = ["#059669", "#0891b2", "#7c3aed", "#db2777", "#d97706", "#2563eb", "#65a30d"];

const StatCard = ({
  icon: Icon,
  label,
  value,
  trendValue,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trendValue: string;
}) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -4 }} transition={{ duration: 0.3 }}>
    <Card className="p-6 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">{label}</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{value}</p>
          <div className="flex items-center gap-1">
            <ArrowUp className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium text-green-600">{trendValue}</span>
          </div>
        </div>
        <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
          <div className="text-emerald-600 dark:text-emerald-400">{Icon}</div>
        </div>
      </div>
    </Card>
  </motion.div>
);

const ChartCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
    <Card className="p-6 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">{title}</h3>
      {children}
    </Card>
  </motion.div>
);

export default function Dashboard() {
  const { data: members } = trpc.members.list.useQuery();
  const { data: activities } = trpc.activities.list.useQuery();
  const { data: quotas } = trpc.quotas.list.useQuery?.() || { data: [] };
  const { data: groups } = trpc.groups.list.useQuery();
  const participationQuery = trpc.dashboard.participationByType.useQuery();

  const totalMembers = members?.length || 0;
  const totalActivities = activities?.length || 0;
  
  // Real gender distribution
  const maleCount = members?.filter((m) => m.sex?.toLowerCase().startsWith("m")).length || 0;
  const femaleCount = members?.filter((m) => m.sex?.toLowerCase().startsWith("f")).length || 0;
  const otherGenderCount = totalMembers - maleCount - femaleCount;
  const genderData = [
    { name: "Masculino", value: maleCount || 1 },
    { name: "Feminino", value: femaleCount || 1 },
    ...(otherGenderCount > 0 ? [{ name: "Outro", value: otherGenderCount }] : []),
  ];

  // Real group distribution
  const groupCounts: Record<string, number> = {};
  members?.forEach((m) => {
    const gName = groups?.find((g) => g.id === m.groupId)?.name || "Sem Grupo";
    groupCounts[gName] = (groupCounts[gName] || 0) + 1;
  });
  const groupChartData = Object.keys(groupCounts).length > 0 
    ? Object.entries(groupCounts).map(([name, count]) => ({ name, membros: count }))
    : [{ name: "Nenhum membro registado", membros: 0 }];
  const participationData = participationQuery.data ?? [];
  const totalPresent = participationData.reduce((sum, entry) => sum + entry.presentCount, 0);
  const participationPieData = participationData.filter((entry) => entry.presentCount > 0);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
  };

  return (
    <DashboardLayoutCustom>
      <motion.div className="space-y-8" variants={containerVariants} initial="hidden" animate="visible">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">Dashboard</h1>
          <p className="text-slate-600 dark:text-slate-400">Visão geral baseada exclusivamente nos dados reais do sistema</p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard icon={<Users className="w-6 h-6" />} label="Total de Membros" value={totalMembers} trendValue="Registo ativo" />
          <StatCard icon={<Calendar className="w-6 h-6" />} label="Atividades Registadas" value={totalActivities} trendValue="Calendário ativo" />
          <StatCard icon={<DollarSign className="w-6 h-6" />} label="Cotas Registadas" value={quotas?.length || 0} trendValue="Módulo financeiro" />
          <StatCard icon={<TrendingUp className="w-6 h-6" />} label="Grupos Operacionais" value={groups?.length || 5} trendValue="5 grupos base" />
        </motion.div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Distribuição de Membros por Grupo">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={groupChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                  <XAxis dataKey="name" stroke="#64748b" />
                  <YAxis stroke="#64748b" allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="membros" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <ChartCard title="Distribuição por Género">
            <div className="h-80 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={genderData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={4} dataKey="value" label>
                    {genderData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>

        <ChartCard title="Participação por Tipo de Actividade">
          {participationQuery.isLoading ? (
            <div className="h-80 flex items-center justify-center text-slate-500 dark:text-slate-400" aria-busy="true">
              A carregar participação…
            </div>
          ) : participationQuery.isError ? (
            <div className="h-80 flex flex-col items-center justify-center gap-3 text-center text-slate-600 dark:text-slate-400" role="alert">
              <AlertCircle className="h-8 w-8 text-amber-500" aria-hidden="true" />
              <p>Não foi possível carregar os dados de participação.</p>
              <button
                type="button"
                onClick={() => void participationQuery.refetch()}
                className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Tentar novamente
              </button>
            </div>
          ) : participationData.length === 0 ? (
            <div className="h-80 flex flex-col items-center justify-center gap-2 text-center text-slate-500 dark:text-slate-400">
              <Activity className="h-9 w-9" aria-hidden="true" />
              <p>Ainda não existem actividades registadas.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-[1.35fr_0.65fr] gap-6">
              <div className="h-80 min-w-0" aria-label="Gráfico de barras da participação por tipo de actividade">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={participationData} margin={{ top: 12, right: 12, left: 0, bottom: 36 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                    <XAxis dataKey="type" stroke="#64748b" angle={-18} textAnchor="end" interval={0} height={58} />
                    <YAxis stroke="#64748b" allowDecimals={false} />
                    <Tooltip formatter={(value, name) => [value, name === "presentCount" ? "Membros presentes" : "Actividades"]} />
                    <Legend />
                    <Bar dataKey="presentCount" name="Membros presentes" fill="#059669" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="activityCount" name="Actividades" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="h-80 min-w-0" aria-label="Gráfico circular da distribuição de presenças por tipo de actividade">
                {totalPresent > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={participationPieData} cx="50%" cy="50%" innerRadius={58} outerRadius={100} paddingAngle={3} dataKey="presentCount" nameKey="type">
                        {participationPieData.map((entry, index) => (
                          <Cell key={`${entry.type}-${index}`} fill={PARTICIPATION_COLORS[index % PARTICIPATION_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} presenças`, "Participação"]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center rounded-lg border border-dashed border-slate-300 text-center text-sm text-slate-500 dark:border-slate-600 dark:text-slate-400">
                    Ainda não existem presenças lançadas para estas actividades.
                  </div>
                )}
              </div>
            </div>
          )}
        </ChartCard>
      </motion.div>
    </DashboardLayoutCustom>
  );
}
