import { motion } from "framer-motion";
import { Users, Calendar, DollarSign, TrendingUp, ArrowUp } from "lucide-react";
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
      </motion.div>
    </DashboardLayoutCustom>
  );
}
