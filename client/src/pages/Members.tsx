import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Search, Edit2, Trash2, Eye, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DashboardLayoutCustom from "@/components/DashboardLayoutCustom";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const emptyForm = {
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
  isGuest: false,
  groupId: undefined as number | undefined,
};

type MemberForm = typeof emptyForm;

export default function Members() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<MemberForm>(emptyForm);
  const { data: members, isLoading, refetch } = trpc.members.list.useQuery();
  const { data: groups } = trpc.groups.list.useQuery();
  const createMemberMutation = trpc.members.create.useMutation({
    onSuccess: () => {
      toast.success("Membro criado com sucesso!");
      setFormData(emptyForm);
      setShowForm(false);
      setEditingId(null);
      void refetch();
    },
    onError: (error) => toast.error(`Erro ao criar membro: ${error.message}`),
  });
  const updateMemberMutation = trpc.members.update.useMutation({
    onSuccess: () => {
      toast.success("Membro atualizado com sucesso!");
      setFormData(emptyForm);
      setShowForm(false);
      setEditingId(null);
      void refetch();
    },
    onError: (error) => toast.error(`Erro ao atualizar membro: ${error.message}`),
  });
  const deleteMemberMutation = trpc.members.delete.useMutation({
    onSuccess: () => {
      toast.success("Membro eliminado com sucesso!");
      void refetch();
    },
    onError: (error) => toast.error(`Erro ao eliminar membro: ${error.message}`),
  });

  const filteredMembers = searchQuery
    ? members?.filter((member) => member.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : members;

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(emptyForm);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Indique o nome completo do membro.");
      return;
    }
    const normalized = {
      ...formData,
      name: formData.name.trim(),
      birthDate: formData.birthDate || undefined,
      email: formData.email.trim() || undefined,
      groupId: formData.groupId ? Number(formData.groupId) : undefined,
    };
    if (editingId) updateMemberMutation.mutate({ id: editingId, data: normalized });
    else createMemberMutation.mutate(normalized);
  };

  const openEdit = (member: NonNullable<typeof members>[number]) => {
    setEditingId(member.id);
    setFormData({
      name: member.name,
      sex: member.sex,
      birthDate: member.birthDate ? new Date(member.birthDate).toISOString().slice(0, 10) : "",
      father: member.father ?? "",
      mother: member.mother ?? "",
      nationality: member.nationality ?? "",
      region: member.region ?? "",
      residence: member.residence ?? "",
      phoneOrange: member.phoneOrange ?? "",
      phoneTelecel: member.phoneTelecel ?? "",
      email: member.email ?? "",
      position: member.position ?? "",
      isGuest: member.isGuest ?? false,
      groupId: member.groupId ?? undefined,
    });
    setShowForm(true);
  };

  const removeMember = (id: number, name: string) => {
    if (window.confirm(`Eliminar o membro ${name}?`)) deleteMemberMutation.mutate({ id });
  };

  const isSaving = createMemberMutation.isPending || updateMemberMutation.isPending;

  return (
    <DashboardLayoutCustom>
      <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <motion.div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">Membros</h1>
            <p className="mt-1 text-slate-600 dark:text-slate-400">Gira todos os membros da congregação.</p>
          </div>
          <Button onClick={() => { if (showForm) closeForm(); else { setFormData(emptyForm); setEditingId(null); setShowForm(true); } }} className="w-full bg-emerald-600 text-white hover:bg-emerald-700 sm:w-auto">
            {showForm ? <X className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
            {showForm ? "Fechar" : "Novo membro"}
          </Button>
        </motion.div>

        {showForm && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800 sm:p-6">
            <h2 className="mb-4 text-xl font-semibold text-slate-900 dark:text-white">{editingId ? "Editar membro" : "Novo membro"}</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input placeholder="Nome completo" value={formData.name} onChange={(event) => setFormData({ ...formData, name: event.target.value })} required />
              <select value={formData.sex} onChange={(event) => setFormData({ ...formData, sex: event.target.value as "M" | "F" })} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white"><option value="M">Masculino</option><option value="F">Feminino</option></select>
              <Input type="date" value={formData.birthDate} onChange={(event) => setFormData({ ...formData, birthDate: event.target.value })} />
              <Input placeholder="Cargo" value={formData.position} onChange={(event) => setFormData({ ...formData, position: event.target.value })} />
              <Input placeholder="Pai" value={formData.father} onChange={(event) => setFormData({ ...formData, father: event.target.value })} />
              <Input placeholder="Mãe" value={formData.mother} onChange={(event) => setFormData({ ...formData, mother: event.target.value })} />
              <Input placeholder="Nacionalidade" value={formData.nationality} onChange={(event) => setFormData({ ...formData, nationality: event.target.value })} />
              <Input placeholder="Região" value={formData.region} onChange={(event) => setFormData({ ...formData, region: event.target.value })} />
              <Input placeholder="Residência" value={formData.residence} onChange={(event) => setFormData({ ...formData, residence: event.target.value })} />
              <Input placeholder="Telefone Orange" value={formData.phoneOrange} onChange={(event) => setFormData({ ...formData, phoneOrange: event.target.value })} />
              <Input placeholder="Telefone Telecel" value={formData.phoneTelecel} onChange={(event) => setFormData({ ...formData, phoneTelecel: event.target.value })} />
              <Input type="email" placeholder="Email" value={formData.email} onChange={(event) => setFormData({ ...formData, email: event.target.value })} />
              <div className="flex flex-col gap-2 sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Grupo de integração (Opcional - Distribuição automática por defeito)</label>
                <select value={formData.groupId || ""} onChange={(event) => setFormData({ ...formData, groupId: event.target.value ? Number(event.target.value) : undefined })} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white">
                  <option value="">Distribuir automaticamente / Atribuir grupo equilibrado</option>
                  {(groups ?? []).map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2 sm:col-span-2">
                <input type="checkbox" id="isGuestCheckbox" checked={formData.isGuest} onChange={(event) => setFormData({ ...formData, isGuest: event.target.checked })} className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                <label htmlFor="isGuestCheckbox" className="text-sm font-medium text-slate-700 dark:text-slate-300">Convidado / Visitante (Encaminhar para o grupo de convidados)</label>
              </div>
              <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={closeForm}>Cancelar</Button><Button type="submit" disabled={isSaving} className="bg-emerald-600 text-white hover:bg-emerald-700">{isSaving ? "A guardar…" : editingId ? "Guardar alterações" : "Guardar membro"}</Button></div>
            </form>
          </motion.div>
        )}

        <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input placeholder="Pesquisar membros…" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="pl-10" /></div>

        <motion.div className="grid grid-cols-1 gap-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {isLoading ? <div className="py-8 text-center text-slate-500">A carregar membros…</div> : filteredMembers && filteredMembers.length > 0 ? filteredMembers.map((member, index) => (
            <motion.div key={member.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }}>
              <Card className="border-slate-200 bg-white p-4 transition-shadow hover:shadow-lg dark:border-slate-700 dark:bg-slate-800"><div className="flex items-start justify-between gap-3"><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h3 className="font-semibold text-slate-900 dark:text-white">{member.name}</h3>{member.isGuest && <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">Convidado</span>}</div><p className="text-sm text-slate-600 dark:text-slate-400">{member.position || "Sem cargo"} · {member.sex === "M" ? "Masculino" : "Feminino"} · Grupo: {(groups ?? []).find((g) => g.id === member.groupId)?.name || "Geral"}</p>{(member.phoneOrange || member.phoneTelecel) && <p className="mt-1 text-xs text-slate-500">{member.phoneOrange || member.phoneTelecel}</p>}</div><div className="flex shrink-0 gap-1"><Button size="icon" variant="ghost" aria-label={`Detalhes de ${member.name}`} onClick={() => toast.info(`${member.name}${member.email ? ` · ${member.email}` : ""}`)}><Eye className="h-4 w-4" /></Button><Button size="icon" variant="ghost" aria-label={`Editar ${member.name}`} onClick={() => openEdit(member)}><Edit2 className="h-4 w-4" /></Button><Button size="icon" variant="ghost" aria-label={`Eliminar ${member.name}`} disabled={deleteMemberMutation.isPending} onClick={() => removeMember(member.id, member.name)}><Trash2 className="h-4 w-4 text-red-500" /></Button></div></div></Card>
            </motion.div>
          )) : <div className="py-8 text-center text-slate-500">Nenhum membro encontrado.</div>}
        </motion.div>
      </motion.div>
    </DashboardLayoutCustom>
  );
}
