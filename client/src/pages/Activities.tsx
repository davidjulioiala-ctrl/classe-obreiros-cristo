import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Calendar, MapPin, Users, Edit2, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DashboardLayoutCustom from "@/components/DashboardLayoutCustom";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

export default function Activities() {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    date: "",
    startTime: "",
    endTime: "",
    location: "",
    type: "",
    audience: "",
    theme: "",
    isReligious: true,
    hasCommission: false,
  });

  const { data: activities, isLoading, refetch } = trpc.activities.list.useQuery();
  const createActivityMutation = trpc.activities.create.useMutation({
    onSuccess: () => {
      toast.success("Atividade criada com sucesso!");
      setFormData({
        name: "",
        date: "",
        startTime: "",
        endTime: "",
        location: "",
        type: "",
        audience: "",
        theme: "",
        isReligious: true,
        hasCommission: false,
      });
      setShowForm(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao criar atividade: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createActivityMutation.mutate(formData);
  };

  const getActivityTypeColor = (type: string | null) => {
    switch (type) {
      case "culto":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "estudo":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
      case "reunião":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
      default:
        return "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400";
    }
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
              Atividades
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Gerencie eventos e atividades da congregação
            </p>
          </div>
          <Button
            onClick={() => setShowForm(!showForm)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Atividade
          </Button>
        </motion.div>

        {/* Form */}
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700"
          >
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
              Nova Atividade
            </h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                placeholder="Nome da atividade"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />

              <Input
                type="time"
                placeholder="Hora de início"
                value={formData.startTime}
                onChange={(e) =>
                  setFormData({ ...formData, startTime: e.target.value })
                }
              />
              <Input
                type="time"
                placeholder="Hora de término"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              />

              <Input
                placeholder="Local"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
              />
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              >
                <option value="">Tipo de atividade</option>
                <option value="culto">Culto</option>
                <option value="estudo">Estudo Bíblico</option>
                <option value="reunião">Reunião</option>
              </select>

              <Input
                placeholder="Público-alvo"
                value={formData.audience}
                onChange={(e) =>
                  setFormData({ ...formData, audience: e.target.value })
                }
              />
              <Input
                placeholder="Tema"
                value={formData.theme}
                onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
              />

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isReligious}
                  onChange={(e) =>
                    setFormData({ ...formData, isReligious: e.target.checked })
                  }
                  className="w-4 h-4"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  Atividade religiosa
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.hasCommission}
                  onChange={(e) =>
                    setFormData({ ...formData, hasCommission: e.target.checked })
                  }
                  className="w-4 h-4"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  Tem comissão
                </span>
              </label>

              <div className="md:col-span-2 flex gap-2">
                <Button
                  type="submit"
                  disabled={createActivityMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {createActivityMutation.isPending ? "A guardar..." : "Guardar"}
                </Button>
                <Button
                  type="button"
                  onClick={() => setShowForm(false)}
                  variant="outline"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Activities List */}
        <motion.div
          className="grid grid-cols-1 gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {isLoading ? (
            <div className="text-center py-8 text-slate-500">
              A carregar atividades...
            </div>
          ) : activities && activities.length > 0 ? (
            activities.map((activity, idx) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="p-6 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                          {activity.name}
                        </h3>
                        {activity.type && (
                          <span
                            className={`text-xs font-semibold px-3 py-1 rounded-full ${getActivityTypeColor(
                              activity.type
                            )}`}
                          >
                            {activity.type}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(activity.date), "dd 'de' MMMM 'de' yyyy", {
                            locale: pt,
                          })}
                        </div>
                        {activity.location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            {activity.location}
                          </div>
                        )}
                        {activity.startTime && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs">🕐</span>
                            {activity.startTime}
                            {activity.endTime && ` - ${activity.endTime}`}
                          </div>
                        )}
                      </div>

                      {activity.theme && (
                        <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                          <strong>Tema:</strong> {activity.theme}
                        </p>
                      )}

                      {activity.audience && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                          <Users className="w-4 h-4" />
                          Público: {activity.audience}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button size="icon" variant="ghost">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost">
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-8 text-slate-500">
              Nenhuma atividade encontrada
            </div>
          )}
        </motion.div>
      </motion.div>
    </DashboardLayoutCustom>
  );
}
