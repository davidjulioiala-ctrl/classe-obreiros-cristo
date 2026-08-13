import { useState } from "react";
import { motion } from "framer-motion";
import { useEffect, useMemo } from "react";
import { Calendar, Users, Check, X, Download, Search, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DashboardLayoutCustom from "@/components/DashboardLayoutCustom";
import { RecordIdBadge } from "@/components/RecordIdBadge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { matchesMemberSearch } from "@shared/memberSearch";

export default function Attendance() {
  const [selectedActivity, setSelectedActivity] = useState<number | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<Record<number, boolean>>({});
  const [memberSearch, setMemberSearch] = useState("");

  const { data: activities, isLoading: activitiesLoading } =
    trpc.activities.list.useQuery();
  const { data: members } = trpc.members.list.useQuery();
  const { data: attendance, refetch: refetchAttendance } = selectedActivity
    ? trpc.activities.getAttendance.useQuery({ activityId: selectedActivity })
    : { data: undefined, refetch: async () => undefined };

  useEffect(() => {
    if (!attendance) return;
    setAttendanceRecords(Object.fromEntries(attendance.map((record) => [record.memberId, record.isPresent])));
  }, [attendance]);

  const recordAttendanceMutation = trpc.activities.recordAttendance.useMutation({
    onSuccess: () => {
      toast.success("Presença registada!");
      void refetchAttendance();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const deleteAttendanceMutation = trpc.activities.deleteAttendance.useMutation({
    onSuccess: () => {
      toast.success("Registo de presença eliminado.");
      void refetchAttendance();
    },
    onError: (error) => toast.error(error.message),
  });

  const handleToggleAttendance = (memberId: number) => {
    setAttendanceRecords((prev) => ({
      ...prev,
      [memberId]: !prev[memberId],
    }));
  };

  const handleSaveAttendance = () => {
    if (!selectedActivity) return;

    Object.entries(attendanceRecords).forEach(([memberId, isPresent]) => {
      recordAttendanceMutation.mutate({
        activityId: selectedActivity,
        memberId: parseInt(memberId),
        isPresent,
      });
    });

    setAttendanceRecords({});
  };

  const selectedActivityData = activities?.find((a) => a.id === selectedActivity);
  const filteredMembers = useMemo(() => (members ?? []).filter((member) => matchesMemberSearch(member, memberSearch)), [members, memberSearch]);
  const presentCount = Object.values(attendanceRecords).filter(Boolean).length;
  const totalMembers = members?.length || 0;

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
              Presenças
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Registe presenças nas atividades
            </p>
          </div>
        </motion.div>

        {/* Activities Selection */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Selecione uma atividade
            </label>
            <select
              value={selectedActivity || ""}
              onChange={(e) =>
                setSelectedActivity(
                  e.target.value ? parseInt(e.target.value) : null
                )
              }
              className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            >
              <option value="">Escolha uma atividade...</option>
              {activities?.map((activity) => (
                <option key={activity.id} value={activity.id}>
                  {activity.name} - {new Date(activity.date).toLocaleDateString("pt-PT")}
                </option>
              ))}
            </select>
          </div>

          {selectedActivityData && (
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                  Estatísticas
                </p>
                <div className="flex gap-2">
                  <div className="px-3 py-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <p className="text-sm font-semibold text-green-800 dark:text-green-400">
                      {presentCount} Presentes
                    </p>
                  </div>
                  <div className="px-3 py-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                    <p className="text-sm font-semibold text-red-800 dark:text-red-400">
                      {totalMembers - presentCount} Ausentes
                    </p>
                  </div>
                </div>
              </div>
              <Button
                onClick={handleSaveAttendance}
                disabled={recordAttendanceMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {recordAttendanceMutation.isPending ? "A guardar..." : "Guardar"}
              </Button>
            </div>
          )}
        </motion.div>

        {/* Activity Details */}
        {selectedActivityData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="p-6 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Atividade
                  </p>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {selectedActivityData.name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Data
                  </p>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {new Date(selectedActivityData.date).toLocaleDateString("pt-PT")}
                  </p>
                </div>
                {selectedActivityData.location && (
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Local
                    </p>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {selectedActivityData.location}
                    </p>
                  </div>
                )}
                {selectedActivityData.theme && (
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Tema
                    </p>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {selectedActivityData.theme}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        )}

        {/* Members Attendance */}
        {selectedActivity && members && (
          <motion.div
            className="space-y-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Membros</h3>
              <div className="relative w-full sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <Input value={memberSearch} onChange={(event) => setMemberSearch(event.target.value)} placeholder="Pesquisar por ID ou nome…" className="pl-9" aria-label="Pesquisar membros por ID ou nome" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {filteredMembers.map((member, idx) => {
                const existingRecord = attendance?.find((record) => record.memberId === member.id);
                return (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.02 }}
                >
                  <Card
                    onClick={() => handleToggleAttendance(member.id)}
                    className={`p-4 cursor-pointer transition-all ${
                      attendanceRecords[member.id]
                        ? "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700"
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2"><RecordIdBadge id={member.id} label="Membro" />{existingRecord && <RecordIdBadge id={existingRecord.id} label="Presença" />}<p className="font-medium text-slate-900 dark:text-white">
                          {member.name}
                        </p></div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {member.position || "Sem cargo"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {existingRecord && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Eliminar presença de ${member.name}`}
                            disabled={deleteAttendanceMutation.isPending}
                            onClick={(event) => {
                              event.stopPropagation();
                              deleteAttendanceMutation.mutate({ id: existingRecord.id });
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                        <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          attendanceRecords[member.id]
                            ? "bg-green-500 text-white"
                            : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        {attendanceRecords[member.id] ? (
                          <Check className="w-5 h-5" />
                        ) : (
                          <X className="w-5 h-5" />
                        )}
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {!selectedActivity && (
          <motion.div
            className="text-center py-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400">
              Selecione uma atividade para registar presenças
            </p>
          </motion.div>
        )}
      </motion.div>
    </DashboardLayoutCustom>
  );
}
