import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, DollarSign, TrendingUp, TrendingDown, Eye, Edit2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardLayoutCustom from "@/components/DashboardLayoutCustom";
import { toast } from "sonner";

export default function Finances() {
  const [activeTab, setActiveTab] = useState("cotas");
  const [showForm, setShowForm] = useState(false);

  // Sample data
  const quotasData = [
    { id: 1, member: "João Silva", month: "Janeiro", amount: 100, paid: true },
    { id: 2, member: "Maria Santos", month: "Janeiro", amount: 100, paid: true },
    { id: 3, member: "Pedro Costa", month: "Janeiro", amount: 100, paid: false },
  ];

  const incomeData = [
    { id: 1, description: "Oferta Especial", amount: 500, date: "2026-07-20", recordedBy: "Líder João" },
    { id: 2, description: "Dízimos", amount: 1200, date: "2026-07-18", recordedBy: "Oficial Maria" },
  ];

  const expensesData = [
    { id: 1, description: "Aluguel Sala", quantity: 1, unitPrice: 2000, total: 2000, date: "2026-07-15" },
    { id: 2, description: "Material Didático", quantity: 50, unitPrice: 50, total: 2500, date: "2026-07-10" },
  ];

  const totalQuotas = quotasData.filter((q) => q.paid).reduce((sum, q) => sum + q.amount, 0);
  const totalIncome = incomeData.reduce((sum, i) => sum + i.amount, 0);
  const totalExpenses = expensesData.reduce((sum, e) => sum + e.total, 0);
  const balance = totalQuotas + totalIncome - totalExpenses;

  return (
    <DashboardLayoutCustom>
      <motion.div
        className="space-y-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {/* Header */}
        <motion.div
          className="flex items-center justify-between"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              Finanças
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Gerencie cotas, receitas e despesas
            </p>
          </div>
        </motion.div>

        {/* Summary Cards */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-4 gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ staggerChildren: 0.1 }}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="p-6 bg-white dark:bg-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                    Cotas Pagas
                  </p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {totalQuotas} XOF
                  </p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="p-6 bg-white dark:bg-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                    Outras Receitas
                  </p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {totalIncome} XOF
                  </p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="p-6 bg-white dark:bg-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                    Despesas
                  </p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {totalExpenses} XOF
                  </p>
                </div>
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <TrendingDown className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="p-6 bg-gradient-to-br from-emerald-500 to-emerald-600">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-emerald-100 mb-1">Saldo Total</p>
                  <p className="text-2xl font-bold text-white">{balance} XOF</p>
                </div>
                <div className="p-3 bg-white/20 rounded-lg">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
              </div>
            </Card>
          </motion.div>
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="cotas">Cotas Mensais</TabsTrigger>
            <TabsTrigger value="receitas">Outras Receitas</TabsTrigger>
            <TabsTrigger value="despesas">Despesas</TabsTrigger>
          </TabsList>

          {/* Cotas Tab */}
          <TabsContent value="cotas" className="space-y-4">
            <div className="flex justify-end">
              <Button
                onClick={() => setShowForm(!showForm)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Registar Cota
              </Button>
            </div>

            {showForm && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700"
              >
                <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">
                  Registar Pagamento de Cota
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Input placeholder="Membro" />
                  <select className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700">
                    <option>Mês</option>
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i} value={i + 1}>
                        {new Date(2026, i).toLocaleDateString("pt-PT", {
                          month: "long",
                        })}
                      </option>
                    ))}
                  </select>
                  <Input placeholder="Montante" type="number" />
                  <Button className="bg-emerald-600 hover:bg-emerald-700">
                    Guardar
                  </Button>
                </div>
              </motion.div>
            )}

            <div className="space-y-2">
              {quotasData.map((quota, idx) => (
                <motion.div
                  key={quota.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card className="p-4 bg-white dark:bg-slate-800">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {quota.member}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {quota.month}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-900 dark:text-white">
                          {quota.amount} XOF
                        </p>
                        <span
                          className={`text-xs font-semibold px-2 py-1 rounded ${
                            quota.paid
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                          }`}
                        >
                          {quota.paid ? "Pago" : "Pendente"}
                        </span>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          {/* Receitas Tab */}
          <TabsContent value="receitas" className="space-y-4">
            <div className="flex justify-end">
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Nova Receita
              </Button>
            </div>

            <div className="space-y-2">
              {incomeData.map((income, idx) => (
                <motion.div
                  key={income.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card className="p-4 bg-white dark:bg-slate-800">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {income.description}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {income.date} • Registado por {income.recordedBy}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600 dark:text-green-400">
                          +{income.amount} XOF
                        </p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          {/* Despesas Tab */}
          <TabsContent value="despesas" className="space-y-4">
            <div className="flex justify-end">
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Nova Despesa
              </Button>
            </div>

            <div className="space-y-2">
              {expensesData.map((expense, idx) => (
                <motion.div
                  key={expense.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card className="p-4 bg-white dark:bg-slate-800">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {expense.description}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {expense.quantity}x @ {expense.unitPrice} XOF • {expense.date}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-red-600 dark:text-red-400">
                          -{expense.total} XOF
                        </p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </DashboardLayoutCustom>
  );
}
