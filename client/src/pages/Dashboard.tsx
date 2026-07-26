import { motion } from "framer-motion";
import { Users, Calendar, DollarSign, TrendingUp, ArrowUp, ArrowDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  LineChart,
  Line,
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

// Sample data for charts
const attendanceData = [
  { name: "Seg", presentes: 45, ausentes: 12 },
  { name: "Ter", presentes: 52, ausentes: 8 },
  { name: "Qua", presentes: 48, ausentes: 10 },
  { name: "Qui", presentes: 61, ausentes: 5 },
  { name: "Sex", presentes: 55, ausentes: 9 },
  { name: "Sab", presentes: 68, ausentes: 3 },
  { name: "Dom", presentes: 72, ausentes: 2 },
];

const contributionData = [
  { name: "Jan", valor: 2400 },
  { name: "Fev", valor: 2210 },
  { name: "Mar", valor: 2290 },
  { name: "Abr", valor: 2000 },
  { name: "Mai", valor: 2181 },
  { name: "Jun", valor: 2500 },
];

const genderData = [
  { name: "Masculino", value: 145 },
  { name: "Feminino", value: 128 },
];

const COLORS = ["#10b981", "#06b6d4"];

const StatCard = ({
  icon: Icon,
  label,
  value,
  trend,
  trendValue,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend: "up" | "down";
  trendValue: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -4 }}
    transition={{ duration: 0.3 }}
  >
    <Card className="p-6 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
            {label}
          </p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            {value}
          </p>
          <div className="flex items-center gap-1">
            {trend === "up" ? (
              <ArrowUp className="w-4 h-4 text-green-500" />
            ) : (
              <ArrowDown className="w-4 h-4 text-red-500" />
            )}
            <span
              className={`text-sm font-medium ${
                trend === "up" ? "text-green-600" : "text-red-600"
              }`}
            >
              {trendValue}
            </span>
          </div>
        </div>
        <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
          <div className="text-emerald-600 dark:text-emerald-400">{Icon}</div>
        </div>
      </div>
    </Card>
  </motion.div>
);

const ChartCard = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    <Card className="p-6 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
        {title}
      </h3>
      {children}
    </Card>
  </motion.div>
);

export default function Dashboard() {
  const { data: members } = trpc.members.list.useQuery();
  const { data: activities } = trpc.activities.list.useQuery();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  return (
    <DashboardLayoutCustom>
      <motion.div
        className="space-y-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
            Dashboard
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Bem-vindo ao sistema de gestão da Classe Obreiros de Cristo
          </p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            icon={<Users className="w-6 h-6" />}
            label="Total de Membros"
            value={members?.length || 0}
            trend="up"
            trendValue="+12% este mês"
          />
          <StatCard
            icon={<Calendar className="w-6 h-6" />}
            label="Presenças Hoje"
            value={72}
            trend="up"
            trendValue="+8% vs semana passada"
          />
          <StatCard
            icon={<DollarSign className="w-6 h-6" />}
            label="Cotas Recebidas"
            value="12,500 XOF"
            trend="up"
            trendValue="+5% vs mês anterior"
          />
          <StatCard
            icon={<TrendingUp className="w-6 h-6" />}
            label="Atividades"
            value={activities?.length || 0}
            trend="up"
            trendValue="+3 este mês"
          />
        </motion.div>

        {/* Charts Grid */}
        <motion.div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Attendance Chart */}
          <ChartCard title="Presenças Semanais">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={attendanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #475569",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "#e2e8f0" }}
                />
                <Legend />
                <Bar dataKey="presentes" fill="#10b981" name="Presentes" />
                <Bar dataKey="ausentes" fill="#ef4444" name="Ausentes" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Contribution Chart */}
          <ChartCard title="Contribuições Mensais">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={contributionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #475569",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "#e2e8f0" }}
                />
                <Line
                  type="monotone"
                  dataKey="valor"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  dot={{ fill: "#06b6d4", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </motion.div>

        {/* Bottom Grid */}
        <motion.div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Gender Distribution */}
          <ChartCard title="Distribuição por Sexo">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={genderData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {genderData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #475569",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "#e2e8f0" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Recent Activities */}
          <ChartCard title="Atividades Recentes">
            <div className="space-y-3">
              {[
                { title: "Culto Dominical", date: "25 Jul 2026", members: 72 },
                { title: "Estudo Bíblico", date: "23 Jul 2026", members: 45 },
                { title: "Reunião de Líderes", date: "21 Jul 2026", members: 12 },
              ].map((activity, idx) => (
                <motion.div
                  key={idx}
                  className="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg"
                  whileHover={{ x: 4 }}
                >
                  <p className="font-medium text-slate-900 dark:text-white text-sm">
                    {activity.title}
                  </p>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {activity.date}
                    </span>
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      {activity.members} membros
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </ChartCard>

          {/* Quick Stats */}
          <ChartCard title="Resumo Rápido">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Taxa de Presença
                  </span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    85%
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-2 rounded-full"
                    style={{ width: "85%" }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Cotas Pagas
                  </span>
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                    72%
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full"
                    style={{ width: "72%" }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Atividades Realizadas
                  </span>
                  <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                    68%
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full"
                    style={{ width: "68%" }}
                  />
                </div>
              </div>
            </div>
          </ChartCard>
        </motion.div>
      </motion.div>
    </DashboardLayoutCustom>
  );
}
