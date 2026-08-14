import { useMemo, useState, useEffect, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Plus, Search, Edit2, Trash2, Eye, X, Download, FileSpreadsheet, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DashboardLayoutCustom from "@/components/DashboardLayoutCustom";
import { RecordIdBadge } from "@/components/RecordIdBadge";
import { ExportColumnDialog } from "@/components/ExportColumnDialog";
import { MEMBER_EXPORT_COLUMN_KEYS, MEMBER_EXPORT_COLUMNS } from "@shared/exportColumns";
import { trpc } from "@/lib/trpc";
import { MemberAttendanceBadge } from "./MemberAttendanceBadge";
import { toast } from "sonner";
import { filterMembers } from "@shared/memberSearch";
import { downloadProtectedFile } from "@/lib/fileDownload";

type MemberForm = {
  name: string;
  sex: "M" | "F";
  birthDate: string;
  father: string;
  mother: string;
  nationality: string;
  region: string;
  residence: string;
  phoneOrange: string;
  phoneTelecel: string;
  email: string;
  position: string;
  leaderRole: string;
  louvorRole: string;
  isGuest: boolean;
  groupId?: number;
};

const createEmptyForm = (): MemberForm => ({
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
  position: "Membro",
  leaderRole: "",
  louvorRole: "",
  isGuest: false,
  groupId: undefined,
});

const optionalText = (value: string) => value.trim() || undefined;

function calculateAge(birthDate?: string | Date | null) {
  if (!birthDate) return null;
  const value = String(birthDate).slice(0, 10);
  const birth = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getUTCFullYear() - birth.getUTCFullYear();
  const monthDiff = today.getUTCMonth() - birth.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getUTCDate() < birth.getUTCDate())) age -= 1;
  return age >= 0 ? age : null;
}

export default function Members() {
  const [searchQuery, setSearchQuery] = useState("");
  const [positionFilter, setPositionFilter] = useState("all");
  const [sexFilter, setSexFilter] = useState<"all" | "M" | "F">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [guestFilter, setGuestFilter] = useState<"all" | "members" | "guests">("all");
  const [groupFilter, setGroupFilter] = useState<number | "all">("all");
  const [showForm, setShowForm] = useState(false);
  const [showGroupManager, setShowGroupManager] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<MemberForm>(() => createEmptyForm());
  const [editingGroup, setEditingGroup] = useState<{ id: number; name: string; description?: string } | null>(null);
  const [exportingFormat, setExportingFormat] = useState<"pdf" | "csv" | "xlsx" | null>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [pendingExportFormat, setPendingExportFormat] = useState<"pdf" | "csv" | "xlsx">("pdf");
  const [selectedExportColumns, setSelectedExportColumns] = useState<string[]>(() => [...MEMBER_EXPORT_COLUMN_KEYS]);
  const [deepLinkHandled, setDeepLinkHandled] = useState(false);
  const { data: members, isLoading, isError: membersError, error: membersQueryError, refetch } = trpc.members.list.useQuery();
  const { data: groups, isError: groupsError, error: groupsQueryError, refetch: refetchGroups } = trpc.groups.list.useQuery();
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
      setFormData(createEmptyForm());
      setShowForm(false);
      setEditingId(null);
      void refetch();
    },
    onError: (error) => toast.error(`Erro ao criar membro: ${error.message}`),
  });
  const updateMemberMutation = trpc.members.update.useMutation({
    onSuccess: () => {
      toast.success("Membro atualizado com sucesso!");
      setFormData(createEmptyForm());
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

  const positionOptions = useMemo(() => {
    const positions = new Set((members ?? []).map((member) => member.position).filter((position): position is string => Boolean(position?.trim())));
    return Array.from(positions).sort((a, b) => a.localeCompare(b, "pt-PT"));
  }, [members]);

  const filteredMembers = useMemo(() => filterMembers(members ?? [], {
    query: searchQuery,
    position: positionFilter,
    sex: sexFilter,
    status: statusFilter,
    guest: guestFilter,
    groupId: groupFilter,
  }), [members, searchQuery, positionFilter, sexFilter, statusFilter, guestFilter, groupFilter]);

  const hasActiveFilters = Boolean(searchQuery.trim()) || positionFilter !== "all" || sexFilter !== "all" || statusFilter !== "all" || guestFilter !== "all" || groupFilter !== "all";

  const clearMemberFilters = () => {
    setSearchQuery("");
    setPositionFilter("all");
    setSexFilter("all");
    setStatusFilter("all");
    setGuestFilter("all");
    setGroupFilter("all");
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(createEmptyForm());
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Indique o nome completo do membro.");
      return;
    }
    const normalized = {
      name: formData.name.trim(),
      sex: formData.sex,
      birthDate: formData.birthDate || undefined,
      father: optionalText(formData.father),
      mother: optionalText(formData.mother),
      nationality: optionalText(formData.nationality),
      region: optionalText(formData.region),
      residence: optionalText(formData.residence),
      phoneOrange: optionalText(formData.phoneOrange),
      phoneTelecel: optionalText(formData.phoneTelecel),
      email: optionalText(formData.email),
      position: optionalText(formData.position),
      leaderRole: optionalText(formData.leaderRole),
      louvorRole: optionalText(formData.louvorRole),
      isGuest: formData.isGuest,
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
      position: member.position ?? "Membro",
      leaderRole: member.leaderRole ?? "",
      louvorRole: member.louvorRole ?? "",
      isGuest: member.isGuest ?? false,
      groupId: member.groupId ?? undefined,
    });
    setShowForm(true);
  };

  useEffect(() => {
    if (deepLinkHandled || !members?.length) return;
    const requestedId = Number(new URLSearchParams(window.location.search).get("edit"));
    const member = Number.isInteger(requestedId) && requestedId > 0 ? members.find((item) => item.id === requestedId) : undefined;
    if (member) openEdit(member);
    setDeepLinkHandled(true);
  }, [deepLinkHandled, members]);

  const removeMember = (id: number, name: string) => {
    if (window.confirm(`Eliminar o membro ${name}?`)) deleteMemberMutation.mutate({ id });
  };

  const openExportDialog = (format: "pdf" | "csv" | "xlsx") => {
    setPendingExportFormat(format);
    setExportDialogOpen(true);
  };

  const exportMembers = async (columns = selectedExportColumns, includePersonalData = false) => {
    if (columns.length === 0) return toast.error("Seleccione pelo menos uma coluna.");
    const format = pendingExportFormat;
    setExportingFormat(format);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      params.set("columns", columns.join(","));
      params.set("includePersonalData", includePersonalData ? "true" : "false");
      await downloadProtectedFile(`/api/members/export/${format}?${params.toString()}`, `membros${searchQuery.trim() ? "-pesquisa" : ""}.${format}`);
      toast.success(`Lista de membros exportada em ${format.toUpperCase()}.`);
      setExportDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível exportar os membros.");
    } finally {
      setExportingFormat(null);
    }
  };

  const isSaving = createMemberMutation.isPending || updateMemberMutation.isPending;

  return (
    <DashboardLayoutCustom>
      <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {(membersError || groupsError) && (
          <div role="alert" className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
            <div>
              <p className="font-semibold">Não foi possível carregar todos os dados dos membros.</p>
              <p className="mt-1 text-xs">{membersQueryError?.message || groupsQueryError?.message || "Verifique a ligação e tente novamente."}</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => { void refetch(); void refetchGroups(); }}>Tentar novamente</Button>
          </div>
        )}
        <motion.div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">Membros e Grupos</h1>
            <p className="mt-1 text-slate-600 dark:text-slate-400">Acompanhe a distribuição por grupos, géneros e convidados da congregação.</p>
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
            <Button onClick={() => openExportDialog("pdf")} disabled={exportingFormat !== null} variant="outline" className="flex-1 sm:flex-initial">
              <Download className="mr-2 h-4 w-4" /> PDF
            </Button>
            <Button onClick={() => openExportDialog("csv")} disabled={exportingFormat !== null} variant="outline" className="flex-1 sm:flex-initial">
              <FileText className="mr-2 h-4 w-4" /> CSV
            </Button>
            <Button onClick={() => openExportDialog("xlsx")} disabled={exportingFormat !== null} variant="outline" className="flex-1 sm:flex-initial">
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
            </Button>
            <Button onClick={() => setShowGroupManager((v) => !v)} variant="outline" className="flex-1 sm:flex-initial">
              {showGroupManager ? "Fechar gestão de grupos" : "Gerir e renomear grupos"}
            </Button>
            <Button onClick={() => { if (showForm) closeForm(); else { setFormData(createEmptyForm()); setEditingId(null); setShowForm(true); } }} className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700 sm:flex-initial">
              {showForm ? <X className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
              {showForm ? "Fechar" : "Novo membro"}
            </Button>
          </div>
        </motion.div>

        {/* SECÇÃO DE RESUMO DOS 4 GRUPOS E CONVIDADOS */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {(() => {
            const allMembers = members ?? [];
            const allGroups = groups ?? [];
            const standardGroups = allGroups.filter(g => g.criteria !== "special:guest");
            const guestGroup = allGroups.find(g => g.criteria === "special:guest" || g.name.toLowerCase().includes("convidado"));

            const renderGroupCard = (group: { id: number; name: string; description?: string | null }) => {
              const groupMembers = allMembers.filter(m => m.groupId === group.id);
              const total = groupMembers.length;
              const males = groupMembers.filter(m => m.sex === "M").length;
              const females = groupMembers.filter(m => m.sex === "F").length;
              const isSelected = groupFilter === group.id;

              return (
                <Card 
                  key={group.id} 
                  onClick={() => setGroupFilter(isSelected ? "all" : group.id)}
                  className={`cursor-pointer border p-4 transition-all hover:shadow-md ${isSelected ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/25 ring-2 ring-emerald-500/20' : 'border-slate-200 dark:border-slate-800'}`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900 dark:text-white truncate" title={group.name}>{group.name}</h3>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                      {total}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{group.description || "Grupo oficial"}</p>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800/80 pt-2">
                    <span>Homens: <strong>{males}</strong></span>
                    <span>Mulheres: <strong>{females}</strong></span>
                  </div>
                </Card>
              );
            };

            const renderGuestCard = () => {
              const guestMembers = allMembers.filter(m => m.isGuest || (guestGroup && m.groupId === guestGroup.id));
              const total = guestMembers.length;
              const males = guestMembers.filter(m => m.sex === "M").length;
              const females = guestMembers.filter(m => m.sex === "F").length;
              const isSelected = guestFilter === "guests";

              return (
                <Card 
                  onClick={() => setGuestFilter(isSelected ? "all" : "guests")}
                  className={`cursor-pointer border p-4 transition-all hover:shadow-md ${isSelected ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/25 ring-2 ring-purple-500/20' : 'border-slate-200 dark:border-slate-800'}`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900 dark:text-white">Convidados</h3>
                    <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-bold text-purple-800 dark:bg-purple-900/50 dark:text-purple-300">
                      {total}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-1">Participantes e visitantes</p>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800/80 pt-2">
                    <span>Homens: <strong>{males}</strong></span>
                    <span>Mulheres: <strong>{females}</strong></span>
                  </div>
                </Card>
              );
            };

            return (
              <>
                {standardGroups.map(renderGroupCard)}
                {renderGuestCard()}
              </>
            );
          })()}
        </div>

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
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Data de nascimento</label>
                  <Input type="date" value={formData.birthDate} onChange={(event) => setFormData({ ...formData, birthDate: event.target.value })} />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="member-age" className="text-sm font-medium text-slate-700 dark:text-slate-300">Idade</label>
                  <Input id="member-age" value={calculateAge(formData.birthDate) === null ? "" : `${calculateAge(formData.birthDate)} anos`} placeholder="Calculada automaticamente" readOnly aria-label="Idade calculada automaticamente" className="bg-slate-50 dark:bg-slate-900" />
                  <p className="text-xs text-slate-500 dark:text-slate-400">Calculada a partir da data atual.</p>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:col-span-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Cargo Eclesiástico</label>
                <select value={["Líder", "Oficial", "Membro", "Membro de Ministério de Louvor", "Convidado"].includes(formData.position) ? formData.position : "Outros"} onChange={(event) => {
                  const val = event.target.value;
                  if (val === "Outros") {
                    setFormData(prev => ({ ...prev, position: "Outro cargo", leaderRole: "", louvorRole: "" }));
                  } else {
                    setFormData(prev => ({ ...prev, position: val, leaderRole: val === "Líder" ? prev.leaderRole : "", louvorRole: val === "Membro de Ministério de Louvor" ? prev.louvorRole : "" }));
                  }
                }} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white" required>
                  <option value="Líder">Líder</option>
                  <option value="Oficial">Oficial</option>
                  <option value="Membro">Membro</option>
                  <option value="Membro de Ministério de Louvor">Membro de Ministério de Louvor</option>
                  <option value="Convidado">Convidado</option>
                  <option value="Outros">Outros (Personalizado)</option>
                </select>
                {!["Líder", "Oficial", "Membro", "Membro de Ministério de Louvor", "Convidado"].includes(formData.position) && (
                  <div className="mt-2 flex flex-col gap-1">
                    <label className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Especificar Cargo Personalizado</label>
                    <Input placeholder="Escreva o cargo personalizado" value={formData.position} onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))} required />
                  </div>
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
                    <select value={["Vocal Principal", "Coro / Voz", "Guitarra", "Teclado", "Bateria", "Baixo"].includes(formData.louvorRole) ? formData.louvorRole : "Outro"} onChange={(event) => {
                      const val = event.target.value;
                      if (val === "Outro") {
                        setFormData(prev => ({ ...prev, louvorRole: "Outro papel" }));
                      } else {
                        setFormData(prev => ({ ...prev, louvorRole: val }));
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
                    {!["Vocal Principal", "Coro / Voz", "Guitarra", "Teclado", "Bateria", "Baixo"].includes(formData.louvorRole) && (
                      <Input placeholder="Especifique o papel ou instrumento musical" value={formData.louvorRole} onChange={(e) => setFormData(prev => ({ ...prev, louvorRole: e.target.value }))} required />
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

        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <Input type="search" aria-label="Pesquisar membros por nome ou ID" placeholder="Pesquisar rapidamente por nome ou ID…" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="pl-10 pr-24" />
            {searchQuery && <Button type="button" variant="ghost" size="sm" onClick={() => setSearchQuery("")} className="absolute right-1 top-1/2 h-8 -translate-y-1/2 px-2 text-xs text-slate-500">Limpar pesquisa</Button>}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1">
              <label htmlFor="member-position-filter" className="text-xs font-medium text-slate-600 dark:text-slate-300">Cargo</label>
              <select id="member-position-filter" aria-label="Filtrar membros por cargo" value={positionFilter} onChange={(event) => setPositionFilter(event.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="all">Todos os cargos</option>
                {positionOptions.map((position) => <option key={position} value={position}>{position}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="member-sex-filter" className="text-xs font-medium text-slate-600 dark:text-slate-300">Sexo</label>
              <select id="member-sex-filter" aria-label="Filtrar membros por sexo" value={sexFilter} onChange={(event) => setSexFilter(event.target.value as typeof sexFilter)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="all">Todos os sexos</option><option value="M">Masculino</option><option value="F">Feminino</option>
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="member-status-filter" className="text-xs font-medium text-slate-600 dark:text-slate-300">Estado</label>
              <select id="member-status-filter" aria-label="Filtrar membros por estado" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="all">Todos os estados</option><option value="active">Ativos</option><option value="inactive">Inativos</option>
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="member-group-filter" className="text-xs font-medium text-slate-600 dark:text-slate-300">Grupo</label>
              <select id="member-group-filter" aria-label="Filtrar membros por grupo" value={groupFilter} onChange={(event) => setGroupFilter(event.target.value === "all" ? "all" : Number(event.target.value))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="all">Todos os grupos</option>
                {(groups ?? []).filter((group) => group.criteria !== "special:guest").map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="member-type-filter" className="text-xs font-medium text-slate-600 dark:text-slate-300">Tipo</label>
              <select id="member-type-filter" aria-label="Filtrar membros por tipo" value={guestFilter} onChange={(event) => setGuestFilter(event.target.value as typeof guestFilter)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="all">Membros e convidados</option><option value="members">Apenas membros</option><option value="guests">Apenas convidados</option>
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-2 border-t border-slate-100 pt-3 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500 dark:text-slate-400" aria-live="polite">{hasActiveFilters ? `${filteredMembers.length} resultado(s) encontrado(s).` : `${members?.length ?? 0} membro(s) registado(s).`}</p>
            <Button type="button" variant="outline" size="sm" onClick={clearMemberFilters} disabled={!hasActiveFilters}>Limpar filtros</Button>
          </div>
        </div>

        <ExportColumnDialog open={exportDialogOpen} onOpenChange={setExportDialogOpen} title={`Exportar membros em ${pendingExportFormat.toUpperCase()}`} description="Escolha as colunas que pretende incluir no ficheiro. A pesquisa actual será mantida." columns={MEMBER_EXPORT_COLUMNS} selected={selectedExportColumns} askPersonalData defaultIncludePersonalData={false} onConfirm={(columns, includePersonalData) => { setSelectedExportColumns(columns); void exportMembers(columns, includePersonalData); }} confirmLabel={`Exportar ${pendingExportFormat.toUpperCase()}`} isSubmitting={exportingFormat !== null} />

        <motion.div className="grid grid-cols-1 gap-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {isLoading ? <div className="py-8 text-center text-slate-500">A carregar membros…</div> : filteredMembers && filteredMembers.length > 0 ? filteredMembers.map((member, index) => (
            <motion.div key={member.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }}>
              <Card className="border-slate-200 bg-white p-4 transition-shadow hover:shadow-lg dark:border-slate-700 dark:bg-slate-800"><div className="flex items-start justify-between gap-3"><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><RecordIdBadge id={member.id} /><h3 className="font-semibold text-slate-900 dark:text-white">{member.name}</h3>{member.isGuest && <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">Convidado</span>}</div><p className="text-sm text-slate-600 dark:text-slate-400">{member.position || "Sem cargo"} · {member.sex === "M" ? "Masculino" : "Feminino"} · Idade: {calculateAge(member.birthDate) === null ? "—" : `${calculateAge(member.birthDate)} anos`} · Grupo: {(groups ?? []).find((g) => g.id === member.groupId)?.name || "Geral"}</p>
<p className="text-xs text-slate-500 dark:text-slate-400">Estado: {member.isActive ? "Ativo" : "Inativo"}</p>{(member.phoneOrange || member.phoneTelecel) && <p className="mt-1 text-xs text-slate-500">{member.phoneOrange || member.phoneTelecel}</p>}
<div className="mt-2">
  <MemberAttendanceBadge memberId={member.id} />
</div>
</div><div className="flex shrink-0 gap-1"><Button size="icon" variant="ghost" aria-label={`Detalhes de ${member.name}`} onClick={() => toast.info(`${member.name}${member.email ? ` · ${member.email}` : ""}`)}><Eye className="h-4 w-4" /></Button><Button size="icon" variant="ghost" aria-label={`Editar ${member.name}`} onClick={() => openEdit(member)}><Edit2 className="h-4 w-4" /></Button><Button size="icon" variant="ghost" aria-label={`Eliminar ${member.name}`} disabled={deleteMemberMutation.isPending} onClick={() => removeMember(member.id, member.name)}><Trash2 className="h-4 w-4 text-red-500" /></Button></div></div></Card>
            </motion.div>
          )) : <div className="py-8 text-center text-slate-500">Nenhum membro encontrado.</div>}
        </motion.div>
      </motion.div>
    </DashboardLayoutCustom>
  );
}
