import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, Download, Eye, Trash2, Plus, Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardLayoutCustom from "@/components/DashboardLayoutCustom";
import { toast } from "sonner";

export default function Reports() {
  const [showGenerateReport, setShowGenerateReport] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<string>("");

  // Sample reports data
  const reports = [
    {
      id: 1,
      activity: "Culto Dominical",
      type: "ata",
      date: "2026-07-25",
      generatedBy: "Líder João",
      members: 72,
      downloads: 5,
    },
    {
      id: 2,
      activity: "Estudo Bíblico",
      type: "relatorio",
      date: "2026-07-23",
      generatedBy: "Oficial Maria",
      members: 45,
      downloads: 3,
    },
    {
      id: 3,
      activity: "Reunião de Líderes",
      type: "ata",
      date: "2026-07-21",
      generatedBy: "Líder João",
      members: 12,
      downloads: 8,
    },
    {
      id: 4,
      activity: "Conferência Especial",
      type: "relatorio",
      date: "2026-07-18",
      generatedBy: "Líder Pedro",
      members: 150,
      downloads: 15,
    },
  ];

  const activities = [
    { id: 1, name: "Culto Dominical", date: "2026-07-25", duration: "1 dia" },
    { id: 2, name: "Estudo Bíblico", date: "2026-07-23", duration: "1 dia" },
    { id: 3, name: "Conferência Especial", date: "2026-07-18", duration: "3 dias" },
    { id: 4, name: "Retiro Espiritual", date: "2026-07-10", duration: "2 dias" },
  ];

  const getReportTypeLabel = (type: string) => {
    return type === "ata" ? "Ata de Atividade" : "Relatório";
  };

  const getReportTypeColor = (type: string) => {
    return type === "ata"
      ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
      : "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
  };

  const handleGenerateReport = () => {
    if (!selectedActivity) {
      toast.error("Selecione uma atividade");
      return;
    }
    toast.success("Relatório gerado com sucesso!");
    setShowGenerateReport(false);
    setSelectedActivity("");
  };

  const handleDownload = (reportId: number) => {
    toast.success("Relatório descarregado!");
  };

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
              Relatórios
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Gerencie atas e relatórios de atividades
            </p>
          </div>
          <Button
            onClick={() => setShowGenerateReport(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Gerar Relatório
          </Button>
        </motion.div>

        {/* Summary Cards */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ staggerChildren: 0.1 }}
        >
          {[
            { label: "Total de Relatórios", value: reports.length },
            { label: "Atas", value: reports.filter((r) => r.type === "ata").length },
            { label: "Relatórios", value: reports.filter((r) => r.type === "relatorio").length },
          ].map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Card className="p-4 bg-white dark:bg-slate-800">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {stat.label}
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                  {stat.value}
                </p>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Reports List */}
        <motion.div
          className="space-y-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {reports.map((report, idx) => (
            <motion.div
              key={report.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className="p-6 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-3 bg-slate-100 dark:bg-slate-700 rounded-lg">
                        <FileText className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">
                          {report.activity}
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {new Date(report.date).toLocaleDateString("pt-PT")}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                      <div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                          Tipo
                        </p>
                        <span
                          className={`text-xs font-semibold px-2 py-1 rounded ${getReportTypeColor(
                            report.type
                          )}`}
                        >
                          {getReportTypeLabel(report.type)}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                          Membros
                        </p>
                        <p className="font-medium text-slate-900 dark:text-white">
                          {report.members}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                          Gerado por
                        </p>
                        <p className="font-medium text-slate-900 dark:text-white">
                          {report.generatedBy}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                          Descarregamentos
                        </p>
                        <p className="font-medium text-slate-900 dark:text-white">
                          {report.downloads}x
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => toast.info("Pré-visualização do relatório")}
                    >
                      <Eye className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDownload(report.id)}
                    >
                      <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Generate Report Dialog */}
        <Dialog open={showGenerateReport} onOpenChange={setShowGenerateReport}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Gerar Novo Relatório</DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                  Selecione a atividade
                </label>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {activities.map((activity) => (
                    <motion.div
                      key={activity.id}
                      onClick={() => setSelectedActivity(activity.id.toString())}
                      className={`p-4 rounded-lg cursor-pointer transition-all border-2 ${
                        selectedActivity === activity.id.toString()
                          ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500"
                          : "bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-slate-900 dark:text-white">
                            {activity.name}
                          </h4>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {new Date(activity.date).toLocaleDateString("pt-PT")} • {activity.duration}
                          </p>
                        </div>
                        {selectedActivity === activity.id.toString() && (
                          <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm">✓</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {selectedActivity && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="p-4 bg-slate-50 dark:bg-slate-700">
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-3">
                      Tipo de documento
                    </h4>
                    <div className="space-y-2">
                      <label className="flex items-center gap-3 p-3 rounded-lg border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 cursor-pointer">
                        <input
                          type="radio"
                          name="reportType"
                          value="ata"
                          defaultChecked
                          className="w-4 h-4"
                        />
                        <span className="font-medium text-slate-900 dark:text-white">
                          Ata de Atividade
                        </span>
                        <span className="text-xs text-slate-600 dark:text-slate-400">
                          (para atividades de 1 dia)
                        </span>
                      </label>
                      <label className="flex items-center gap-3 p-3 rounded-lg border-2 border-slate-200 dark:border-slate-600 cursor-pointer hover:border-slate-300 dark:hover:border-slate-500">
                        <input
                          type="radio"
                          name="reportType"
                          value="relatorio"
                          className="w-4 h-4"
                        />
                        <span className="font-medium text-slate-900 dark:text-white">
                          Relatório Completo
                        </span>
                        <span className="text-xs text-slate-600 dark:text-slate-400">
                          (para atividades com mais de 1 dia)
                        </span>
                      </label>
                    </div>
                  </Card>
                </motion.div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowGenerateReport(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleGenerateReport}
                disabled={!selectedActivity}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Gerar Relatório
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    </DashboardLayoutCustom>
  );
}
