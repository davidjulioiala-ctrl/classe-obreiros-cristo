import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Search, Edit2, Trash2, Eye } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DashboardLayoutCustom from "@/components/DashboardLayoutCustom";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Members() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    sex: "M" as "M" | "F",
    birthDate: "",
    father: "",
    mother: "",
    nationality: "",
    region: "",
    residence: "",
    phoneOrange: "",
    phoneTelecel: "",
    email: "",
    position: "",
  });

    const { data: members, isLoading, refetch } = trpc.members.list.useQuery();
  const createMemberMutation = trpc.members.create.useMutation({
    onSuccess: () => {
      toast.success("Membro criado com sucesso!");
      setFormData({
        name: "",
        sex: "M",
        birthDate: "",
        father: "",
        mother: "",
        nationality: "",
        region: "",
        residence: "",
        phoneOrange: "",
        phoneTelecel: "",
        email: "",
        position: "",
      });
      setShowForm(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao criar membro: ${error.message}`);
    },
  });

  const filteredMembers = searchQuery
    ? members?.filter((m) =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : members;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMemberMutation.mutate(formData);
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
              Membros
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Gerencie todos os membros da congregação
            </p>
          </div>
          <Button
            onClick={() => setShowForm(!showForm)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Membro
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
              Novo Membro
            </h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                placeholder="Nome completo"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <select
                value={formData.sex}
                onChange={(e) =>
                  setFormData({ ...formData, sex: e.target.value as "M" | "F" })
                }
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              >
                <option value="M">Masculino</option>
                <option value="F">Feminino</option>
              </select>

              <Input
                type="date"
                placeholder="Data de nascimento"
                value={formData.birthDate}
                onChange={(e) =>
                  setFormData({ ...formData, birthDate: e.target.value })
                }
              />
              <Input
                placeholder="Pai"
                value={formData.father}
                onChange={(e) => setFormData({ ...formData, father: e.target.value })}
              />

              <Input
                placeholder="Mãe"
                value={formData.mother}
                onChange={(e) => setFormData({ ...formData, mother: e.target.value })}
              />
              <Input
                placeholder="Nacionalidade"
                value={formData.nationality}
                onChange={(e) =>
                  setFormData({ ...formData, nationality: e.target.value })
                }
              />

              <Input
                placeholder="Região"
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
              />
              <Input
                placeholder="Residência"
                value={formData.residence}
                onChange={(e) =>
                  setFormData({ ...formData, residence: e.target.value })
                }
              />

              <Input
                placeholder="Telefone Orange"
                value={formData.phoneOrange}
                onChange={(e) =>
                  setFormData({ ...formData, phoneOrange: e.target.value })
                }
              />
              <Input
                placeholder="Telefone Telecel"
                value={formData.phoneTelecel}
                onChange={(e) =>
                  setFormData({ ...formData, phoneTelecel: e.target.value })
                }
              />

              <Input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              <Input
                placeholder="Cargo"
                value={formData.position}
                onChange={(e) =>
                  setFormData({ ...formData, position: e.target.value })
                }
              />

              <div className="md:col-span-2 flex gap-2">
                <Button
                  type="submit"
                  disabled={createMemberMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {createMemberMutation.isPending ? "A guardar..." : "Guardar"}
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

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Pesquisar membros..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Members List */}
        <motion.div
          className="grid grid-cols-1 gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {isLoading ? (
            <div className="text-center py-8 text-slate-500">
              A carregar membros...
            </div>
          ) : filteredMembers && filteredMembers.length > 0 ? (
            filteredMembers.map((member, idx) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="p-4 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 dark:text-white">
                        {member.name}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {member.position || "Sem cargo"} • {member.sex === "M" ? "Masculino" : "Feminino"}
                      </p>
                      {member.phoneOrange && (
                        <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                          📱 {member.phoneOrange} / {member.phoneTelecel}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button size="icon" variant="ghost">
                        <Eye className="w-4 h-4" />
                      </Button>
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
              Nenhum membro encontrado
            </div>
          )}
        </motion.div>
      </motion.div>
    </DashboardLayoutCustom>
  );
}
