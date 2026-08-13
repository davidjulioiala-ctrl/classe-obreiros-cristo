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
  leaderRole: "",
  louvorRole: "",
  isGuest: false,
  groupId: undefined as number | undefined,
};

type MemberForm = typeof emptyForm;

export default function Members() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showGroupManager, setShowGroupManager] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<MemberForm>(emptyForm);
  const [editingGroup, setEditingGroup] = useState<{ id: number; name: string; description?: string } | null>(null);
  const { data: members, isLoading, refetch } = trpc.members.list.useQuery();
  const { data: groups, refetch: refetchGroups } = trpc.groups.list.useQuery();
  const utils = trpc.useUtils();
  const updateGroupMutation = trpc.groups.update.useMutation({
    onSuccess: () => {
      toast.success("Grupo atualizado com sucesso!");
      setEditingGroup(null);
      void refetchGroups();
      void utils.groups.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });
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
      leaderRole: member.leaderRole ?? "",
      louvorRole: member.louvorRole ?? "",
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
          <div className="flex gap-2 w-full sm:w-auto">
            <Button onClick={() => setShowGroupManager((v) => !v)} variant="outline" className="flex-1 sm:flex-initial">
              {showGroupManager ? "Fechar gestão de grupos" : "Gerir e renomear grupos"}
            </Button>
            <Button onClick={() => { if (showForm) closeForm(); else { setFormData(emptyForm); setEditingId(null); setShowForm(true); } }} className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700 sm:flex-initial">
              {showForm ? <X className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
              {showForm ? "Fechar" : "Novo membro"}
            </Button>
          </div>
        </motion.div>

        {showGroupManager && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800 sm:p-6 space-y-4">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Gestão e Renomeação dos 5 Grupos Base</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">Pode alterar o nome e a descrição de qualquer grupo a qualquer altura sem perder os dados dos membros associados.</p>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {(groups ?? []).map((grp) => (
                <Card key={grp.id} className="p-4 border border-slate-200 dark:border-slate-700">
                  <div className="space-y-3">
                    <Input defaultValue={grp.name} id={`group-name-${grp.id}`} placeholder="Nome do grupo" />
                    <Input defaultValue={grp.description || ""} id={`group-desc-${grp.id}`} placeholder="Descrição" />
                    <Button size="sm" className="w-full bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => {
                      const nameInput = document.getElementById(`group-name-${grp.id}`) as HTMLInputElement;
                      const descInput = document.getElementById(`group-desc-${grp.id}`) as HTMLInputElement;
                      if (!nameInput?.value.trim()) return toast.error("O nome do grupo não pode estar vazio.");
                      updateGroupMutation.mutate({ id: grp.id, name: nameInput.value.trim(), description: descInput?.value.trim() });
                    }}>
                      Atualizar grupo
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </motion.div>
        )}

        {showForm && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800 sm:p-6">
            <h2 className="mb-4 text-xl font-semibold text-slate-900 dark:text-white">{editingId ? "Editar membro" : "Novo membro"}</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input placeholder="Nome completo" value={formData.name} onChange={(event) => setFormData({ ...formData, name: event.target.value })} required />
              <select value={formData.sex} onChange={(event) => setFormData({ ...formData, sex: event.target.value as "M" | "F" })} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white"><option value="M">Masculino</option><option value="F">Feminino</option></select>
              <Input type="date" value={formData.birthDate} onChange={(event) => setFormData({ ...formData, birthDate: event.target.value })} />
              <div className="flex flex-col gap-2 sm:col-span-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Cargo Eclesiástico</label>
                <select value={["Líder", "Oficial", "Membro de Ministério de Louvor", "Convidado"].includes(formData.position) ? formData.position : (formData.position ? "Outros" : "Líder")} onChange={(event) => {
                  const val = event.target.value;
                  if (val === "Outros") {
                    setFormData({ ...formData, position: "", leaderRole: "", louvorRole: "" });
                  } else {
                    setFormData({ ...formData, position: val, leaderRole: val === "Líder" ? formData.leaderRole : "", louvorRole: val === "Membro de Ministério de Louvor" ? formData.louvorRole : "" });
                  }
                }} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white" required>
                  <option value="Líder">Líder</option>
                  <option value="Oficial">Oficial</option>
                  <option value="Membro de Ministério de Louvor">Membro de Ministério de Louvor</option>
                  <option value="Convidado">Convidado</option>
                  <option value="Outros">Outros (Personalizado)</option>
                </select>
                {(!["Líder", "Oficial", "Membro de Ministério de Louvor", "Convidado"].includes(formData.position) || formData.position === "") && (
                  <Input placeholder="Escreva o cargo personalizado" value={formData.position} onChange={(e) => setFormData({ ...formData, position: e.target.value })} required />
                )}

                {/* Se for Líder, abrir campo para especificar a função dos líderes */}
                {formData.position === "Líder" && (
                  <div className="mt-2 flex flex-col gap-1">
                    <label className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Especificar Função de Líder</label>
                    <Input placeholder="Ex: Pastor Líder, Tesoureiro Geral, Secretário, Líder de Jovens…" value={formData.leaderRole} onChange={(e) => setFormData({ ...formData, leaderRole: e.target.value })} required />
                  </div>
                )}

                {/* Se for Membro de Ministério de Louvor, abrir opção de papel com opção Outros */}
                {formData.position === "Membro de Ministério de Louvor" && (
                  <div className="mt-2 flex flex-col gap-2">
                    <label className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Papel no Ministério de Louvor</label>
                    <select value={["Vocal Principal", "Coro / Voz", "Guitarra", "Teclado", "Bateria", "Baixo"].includes(formData.louvorRole) ? formData.louvorRole : (formData.louvorRole ? "Outro" : "Vocal Principal")} onChange={(event) => {
                      const val = event.target.value;
                      if (val === "Outro") {
                        setFormData({ ...formData, louvorRole: "" });
                      } else {
                        setFormData({ ...formData, louvorRole: val });
                      }
                    }} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white">
                      <option value="Vocal Principal">Vocal Principal</option>
                      <option value="Coro / Voz">Coro / Voz</option>
                      <option value="Guitarra">Guitarra</option>
                      <option value="Teclado">Teclado</option>
                      <option value="Bateria">Bateria</option>
                      <option value="Baixo">Baixo</option>
                      <option value="Outro">Outro (Especificar)</option>
                    </select>
                    {(!["Vocal Principal", "Coro / Voz", "Guitarra", "Teclado", "Bateria", "Baixo"].includes(formData.louvorRole) || formData.louvorRole === "") && (
                      <Input placeholder="Especifique o papel ou instrumento musical" value={formData.louvorRole} onChange={(e) => setFormData({ ...formData, louvorRole: e.target.value })} required />
                    )}
                  </div>
                )}
              </div>
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
