import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRightLeft,
  Plus,
  Check,
  X,
  Trash2,
  ChevronRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import DashboardLayoutCustom from "@/components/DashboardLayoutCustom";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Transfers() {
  const [showNewTransfer, setShowNewTransfer] = useState(false);
  const [selectedTransferId, setSelectedTransferId] = useState<number | null>(
    null
  );
  const [membersToTransfer, setMembersToTransfer] = useState<number[]>([]);
  const [formData, setFormData] = useState({
    toChurch: "",
    reason: "",
  });

  const { data: members } = trpc.members.list.useQuery();
  const { data: groups } = trpc.groups.list.useQuery();

  // Sample transfers data
  const transfers = [
    {
      id: 1,
      member: "João Silva",
      fromGroup: "Homens",
      toChurch: "Igreja Central",
      reason: "Mudança de residência",
      status: "pendente",
      date: "2026-07-20",
    },
    {
      id: 2,
      member: "Maria Santos",
      fromGroup: "Mulheres",
      toChurch: "Igreja do Bairro",
      reason: "Proximidade",
      status: "aprovada",
      date: "2026-07-18",
    },
    {
      id: 3,
      member: "Pedro Costa",
      fromGroup: "Homens",
      toChurch: "Igreja Filial",
      reason: "Trabalho",
      status: "concluida",
      date: "2026-07-15",
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pendente":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "aprovada":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "concluida":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      default:
        return "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400";
    }
  };

  const handleAddMember = (memberId: number) => {
    setMembersToTransfer((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleSubmitTransfer = () => {
    if (membersToTransfer.length === 0) {
      toast.error("Selecione pelo menos um membro");
      return;
    }

    // Here you would call the mutation to create transfers
    toast.success(`${membersToTransfer.length} transferência(s) criada(s)`);
    setMembersToTransfer([]);
    setFormData({ toChurch: "", reason: "" });
    setShowNewTransfer(false);
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
              Transferências
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Gerencie transferências de membros entre grupos ou igrejas
            </p>
          </div>
          <Button
            onClick={() => setShowNewTransfer(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Transferência
          </Button>
        </motion.div>

        {/* Summary Cards */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-4 gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ staggerChildren: 0.1 }}
        >
          {[
            { label: "Pendentes", value: 1, color: "yellow" },
            { label: "Aprovadas", value: 1, color: "blue" },
            { label: "Concluídas", value: 1, color: "green" },
            { label: "Total", value: 3, color: "slate" },
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
                <p className={`text-2xl font-bold mt-2 text-${stat.color}-600`}>
                  {stat.value}
                </p>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Transfers List */}
        <motion.div
          className="space-y-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {transfers.map((transfer, idx) => (
            <motion.div
              key={transfer.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className="p-6 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                        {transfer.member.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">
                          {transfer.member}
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {transfer.fromGroup}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      <div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                          Para
                        </p>
                        <p className="font-medium text-slate-900 dark:text-white">
                          {transfer.toChurch}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                          Motivo
                        </p>
                        <p className="font-medium text-slate-900 dark:text-white">
                          {transfer.reason}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                          Data
                        </p>
                        <p className="font-medium text-slate-900 dark:text-white">
                          {new Date(transfer.date).toLocaleDateString("pt-PT")}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-semibold px-3 py-1 rounded-full ${getStatusColor(
                        transfer.status
                      )}`}
                    >
                      {transfer.status === "pendente" && "Pendente"}
                      {transfer.status === "aprovada" && "Aprovada"}
                      {transfer.status === "concluida" && "Concluída"}
                    </span>

                    {transfer.status === "pendente" && (
                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}

                    {transfer.status === "aprovada" && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    )}

                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-slate-600 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* New Transfer Dialog */}
        <Dialog open={showNewTransfer} onOpenChange={setShowNewTransfer}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nova Transferência</DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Step 1: Select Members */}
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-3">
                  Passo 1: Selecione os membros
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {members?.map((member) => (
                    <motion.div
                      key={member.id}
                      onClick={() => handleAddMember(member.id)}
                      className={`p-3 rounded-lg cursor-pointer transition-all ${
                        membersToTransfer.includes(member.id)
                          ? "bg-emerald-100 dark:bg-emerald-900/30 border-2 border-emerald-500"
                          : "bg-slate-100 dark:bg-slate-700 border-2 border-transparent hover:border-slate-300 dark:hover:border-slate-600"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-900 dark:text-white">
                          {member.name}
                        </span>
                        {membersToTransfer.includes(member.id) && (
                          <Check className="w-5 h-5 text-emerald-600" />
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
                {membersToTransfer.length > 0 && (
                  <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-2">
                    {membersToTransfer.length} membro(s) selecionado(s)
                  </p>
                )}
              </div>

              {/* Step 2: Transfer Details */}
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-3">
                  Passo 2: Detalhes da transferência
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Para qual igreja/grupo?
                    </label>
                    <Input
                      placeholder="Ex: Igreja Central, Grupo de Jovens"
                      value={formData.toChurch}
                      onChange={(e) =>
                        setFormData({ ...formData, toChurch: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Motivo da transferência
                    </label>
                    <textarea
                      placeholder="Explique o motivo da transferência..."
                      value={formData.reason}
                      onChange={(e) =>
                        setFormData({ ...formData, reason: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              {/* Step 3: Review */}
              {membersToTransfer.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-3">
                    Passo 3: Revisão
                  </h3>
                  <Card className="p-4 bg-slate-50 dark:bg-slate-700">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">
                          Membros a transferir:
                        </span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {membersToTransfer.length}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">
                          Destino:
                        </span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {formData.toChurch || "Não especificado"}
                        </span>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowNewTransfer(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmitTransfer}
                disabled={membersToTransfer.length === 0}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Criar Transferência(s)
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    </DashboardLayoutCustom>
  );
}
