import { useMemo, useState, useEffect, type FormEvent, type ChangeEvent } from "react";
import { motion } from "framer-motion";
import { Plus, Search, Edit2, Trash2, Eye, X, Download, FileSpreadsheet, FileText, Upload, FileDown, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DashboardLayoutCustom from "@/components/DashboardLayoutCustom";
import { useLocalAuth } from "@/_core/hooks/useLocalAuth";
import { RecordIdBadge } from "@/components/RecordIdBadge";
import { ExportColumnDialog } from "@/components/ExportColumnDialog";
import { MEMBER_EXPORT_COLUMN_KEYS, MEMBER_EXPORT_COLUMNS } from "@shared/exportColumns";
import { trpc } from "@/lib/trpc";
import { MemberAttendanceBadge } from "./MemberAttendanceBadge";
import { toast } from "sonner";
import { filterMembers } from "@shared/memberSearch";
import { downloadProtectedFile } from "@/lib/fileDownload";
import { createMemberImportTemplate, createRejectedMembersCsv, createRejectedMembersExcel, MEMBER_IMPORT_COLUMNS, parseMemberImportFile, revalidateMemberImportRows, type MemberImportRow } from "@/lib/memberImport";

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

type SafeGroup = { id: number; name: string; description: string; criteria?: string | null };

function normalizeGroups(value: unknown): SafeGroup[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const candidate = item as { id?: unknown; name?: unknown; description?: unknown; criteria?: unknown };
    const id = Number(candidate.id);
    if (!Number.isInteger(id) || id <= 0) return [];
    return [{
      id,
      name: typeof candidate.name === "string" && candidate.name.trim() ? candidate.name.trim() : `Grupo ${id}`,
      description: typeof candidate.description === "string" ? candidate.description : "",
      criteria: typeof candidate.criteria === "string" ? candidate.criteria : null,
    }];
  });
}

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
  const { user } = useLocalAuth();
  const canExportMembers = user?.role === "admin" || (user?.churchRole !== undefined && user.churchRole !== "oficial");
  const canImportMembers = user?.role === "admin" || user?.churchRole === "oficial" || user?.churchRole === "lider";
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
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFileName, setImportFileName] = useState("");
  const [importRows, setImportRows] = useState<MemberImportRow[]>([]);
  const [importInvalidRows, setImportInvalidRows] = useState<MemberImportRow[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importCompleted, setImportCompleted] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importPhase, setImportPhase] = useState<"idle" | "reading" | "validating" | "ready" | "uploading" | "completed">("idle");
  const [importStep, setImportStep] = useState<"select" | "preview">("select");
  const [editingInvalidRow, setEditingInvalidRow] = useState<number | null>(null);
  const { data: members, isLoading, isError: membersError, error: membersQueryError, refetch } = trpc.members.list.useQuery();
  const { data: groups, isError: groupsError, error: groupsQueryError, refetch: refetchGroups } = trpc.groups.list.useQuery();
  const safeGroups = useMemo(() => normalizeGroups(groups), [groups]);
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

  const bulkImportMutation = trpc.members.bulkImport.useMutation({
    onSuccess: (data) => {
      const rejectedCount = importInvalidRows.length;
      setImportProgress(100);
      setImportPhase("completed");
      toast.success(`${data.count} membro(s) importado(s) com sucesso${rejectedCount > 0 ? `; ${rejectedCount} linha(s) ficaram disponíveis para relatório.` : "."}`);
      setImportRows([]);
      setImportCompleted(rejectedCount > 0);
      if (rejectedCount === 0) {
        setImportInvalidRows([]);
        setImportFileName("");
        setImportDialogOpen(false);
      }
      void refetch();
      void utils.members.list.invalidate();
    },
    onError: (error) => {
      setImportProgress(100);
      setImportPhase("ready");
      toast.error(`Importação rejeitada: ${error.message}`);
    },
  });

  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  const [bulkTargetGroupId, setBulkTargetGroupId] = useState<number | ''>('');
  const [bulkMoveModalOpen, setBulkMoveModalOpen] = useState(false);

  const bulkMoveMutation = trpc.members.bulkMoveGroup.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.count} membro(s) movido(s) com sucesso para o grupo ${data.targetGroupName}!`);
      setSelectedMemberIds([]);
      setBulkTargetGroupId('');
      setBulkMoveModalOpen(false);
      void refetch();
    },
    onError: (err) => {
      toast.error(`Erro ao mover membros: ${err.message}`);
    },
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

  const allVisibleSelected = Boolean(filteredMembers && filteredMembers.length > 0 && filteredMembers.every(m => selectedMemberIds.includes(m.id)));

  const toggleSelectAll = () => {
    if (!filteredMembers || filteredMembers.length === 0) return;
    if (allVisibleSelected) {
      const visibleIds = new Set(filteredMembers.map(m => m.id));
      setSelectedMemberIds(prev => prev.filter(id => !visibleIds.has(id)));
    } else {
      const visibleIds = filteredMembers.map(m => m.id);
      setSelectedMemberIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const toggleSelectMember = (id: number) => {
    setSelectedMemberIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const resetImportDialog = () => {
    setImportDialogOpen(false);
    setImportFileName("");
    setImportRows([]);
    setImportInvalidRows([]);
    setImportCompleted(false);
    setImportProgress(0);
    setImportPhase("idle");
    setImportStep("select");
    setEditingInvalidRow(null);
  };

  const chooseAnotherImportFile = () => {
    setImportFileName("");
    setImportRows([]);
    setImportInvalidRows([]);
    setImportCompleted(false);
    setImportProgress(0);
    setImportPhase("idle");
    setImportStep("select");
    setEditingInvalidRow(null);
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setImportLoading(true);
    setImportCompleted(false);
    setImportStep("select");
    setImportProgress(12);
    setImportPhase("reading");
    setImportFileName(file.name);
    const validationTimer = window.setTimeout(() => {
      setImportProgress(52);
      setImportPhase("validating");
    }, 140);
    try {
      const result = await parseMemberImportFile(file, safeGroups.map((group) => ({ id: group.id, name: group.name })), (members ?? []).map((member) => ({ id: member.id, name: member.name, email: member.email })));
      setImportProgress(100);
      setImportPhase("ready");
      setImportStep("preview");
      setImportRows(result.validRows);
      setImportInvalidRows(result.invalidRows);
      if (result.invalidRows.length > 0) toast.warning(`${result.invalidRows.length} linha(s) têm problemas e não serão importadas.`);
      else toast.success(`${result.validRows.length} linha(s) prontas para importação.`);
    } catch (error) {
      setImportRows([]);
      setImportInvalidRows([]);
      setImportCompleted(false);
      setImportProgress(0);
      setImportPhase("idle");
      setImportStep("select");
      setImportFileName("");
      toast.error(error instanceof Error ? error.message : "Não foi possível ler o ficheiro.");
    } finally {
      window.clearTimeout(validationTimer);
      setImportLoading(false);
    }
  };

  const updateInvalidRowField = (sourceRow: number, field: "name" | "sex" | "birthDate" | "email" | "position" | "groupName", value: string) => {
    setImportInvalidRows((current) => current.map((row) => row.sourceRow === sourceRow ? { ...row, [field]: field === "sex" ? value as MemberImportRow["sex"] : value } : row));
  };

  const updateInvalidRowGroup = (sourceRow: number, value: string) => {
    const group = safeGroups.find((item) => String(item.id) === value);
    setImportInvalidRows((current) => current.map((row) => row.sourceRow === sourceRow ? { ...row, groupId: group?.id, groupName: group?.name } : row));
  };

  const revalidateInvalidRow = (sourceRow: number) => {
    const allRows = [...importRows, ...importInvalidRows].sort((a, b) => a.sourceRow - b.sourceRow);
    const result = revalidateMemberImportRows(allRows, safeGroups.map((group) => ({ id: group.id, name: group.name })), (members ?? []).map((member) => ({ id: member.id, name: member.name, email: member.email })));
    setImportRows(result.validRows);
    setImportInvalidRows(result.invalidRows);
    setEditingInvalidRow(null);
    const updated = result.invalidRows.find((row) => row.sourceRow === sourceRow);
    if (updated) toast.warning(`A linha ${sourceRow} ainda precisa de correcções: ${updated.errors.join(" ")}`);
    else toast.success(`A linha ${sourceRow} foi corrigida e está pronta para importação.`);
  };

  const confirmImport = () => {
    if (importRows.length === 0 || bulkImportMutation.isPending) return;
    setImportProgress(72);
    setImportPhase("uploading");
    bulkImportMutation.mutate({ rows: importRows.map(({ errors: _errors, sourceRow: _sourceRow, groupName: _groupName, ...row }) => ({ ...row, sex: row.sex as "M" | "F" })) });
  };

  const downloadImportTemplate = () => {
    const blob = new Blob([createMemberImportTemplate()], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "modelo-importacao-membros.xlsx";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const downloadRejectedReport = (format: "csv" | "xlsx") => {
    if (importInvalidRows.length === 0) return;
    const isCsv = format === "csv";
    const body = isCsv ? createRejectedMembersCsv(importInvalidRows) : createRejectedMembersExcel(importInvalidRows);
    const blob = new Blob([body], { type: isCsv ? "text/csv;charset=utf-8" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `relatorio-linhas-rejeitadas-${new Date().toISOString().slice(0, 10)}.${format}`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success(`Relatório ${isCsv ? "CSV" : "Excel"} descarregado.`);
  };
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

  const openGroupExportDialog = (groupId: number | "guests", format: "pdf" | "csv" | "xlsx") => {
    setGroupFilter(groupId === "guests" ? "all" : groupId);
    setGuestFilter(groupId === "guests" ? "guests" : "all");
    setPendingExportFormat(format);
    setExportDialogOpen(true);
  };

  const exportScopeLabel = groupFilter !== "all"
    ? safeGroups.find((group) => group.id === groupFilter)?.name
    : guestFilter === "guests" ? "convidados" : undefined;

  const exportMembers = async (columns = selectedExportColumns, includePersonalData = false) => {
    if (columns.length === 0) return toast.error("Seleccione pelo menos uma coluna.");
    const format = pendingExportFormat;
    setExportingFormat(format);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      if (positionFilter !== "all") params.set("position", positionFilter);
      if (sexFilter !== "all") params.set("sex", sexFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (guestFilter !== "all") params.set("guest", guestFilter);
      if (groupFilter !== "all") params.set("groupId", String(groupFilter));
      params.set("columns", columns.join(","));
      params.set("includePersonalData", includePersonalData ? "true" : "false");
      const hasActiveFilters = Boolean(searchQuery.trim()) || positionFilter !== "all" || sexFilter !== "all" || statusFilter !== "all" || guestFilter !== "all" || groupFilter !== "all";
      const scopeSuffix = exportScopeLabel ? `-${exportScopeLabel.toLocaleLowerCase("pt-PT").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}` : "";
      await downloadProtectedFile(`/api/members/export/${format}?${params.toString()}`, `membros${scopeSuffix}${hasActiveFilters && !scopeSuffix ? "-filtrados" : ""}.${format}`);
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
            {canImportMembers && (
              <>
                <Button onClick={() => setImportDialogOpen(true)} variant="outline" className="flex-1 sm:flex-initial">
                  <Upload className="mr-2 h-4 w-4" /> Importar membros
                </Button>
                <Button onClick={downloadImportTemplate} variant="ghost" className="flex-1 sm:flex-initial" title="Descarregar modelo Excel para importação">
                  <FileDown className="mr-2 h-4 w-4" /> Modelo
                </Button>
              </>
            )}
            {canExportMembers && (
              <>
                <Button onClick={() => openExportDialog("pdf")} disabled={exportingFormat !== null} variant="outline" className="flex-1 sm:flex-initial">
                  <Download className="mr-2 h-4 w-4" /> PDF
                </Button>
                <Button onClick={() => openExportDialog("csv")} disabled={exportingFormat !== null} variant="outline" className="flex-1 sm:flex-initial">
                  <FileText className="mr-2 h-4 w-4" /> CSV
                </Button>
                <Button onClick={() => openExportDialog("xlsx")} disabled={exportingFormat !== null} variant="outline" className="flex-1 sm:flex-initial">
                  <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
                </Button>
              </>
            )}
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
            const allGroups = safeGroups;
            const standardGroups = allGroups.filter(g => g.criteria !== "special:guest");
            const guestGroup = allGroups.find(g => g.criteria === "special:guest" || g.name.toLowerCase().includes("convidado"));

            const renderGroupCard = (group: { id: number; name: string; description?: string | null }) => {
              const groupMembers = allMembers.filter(m => m?.groupId === group.id);
              const total = groupMembers.length;
              const males = groupMembers.filter(m => m.sex === "M").length;
              const females = groupMembers.filter(m => m.sex === "F").length;
              const isSelected = groupFilter === group.id;

              return (
                <Card 
                  key={group.id} 
                  onClick={() => { setGuestFilter("all"); setGroupFilter(isSelected ? "all" : group.id); }}
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
                  {canExportMembers && (
                    <div className="mt-3 grid grid-cols-3 gap-1 border-t border-slate-100 pt-2 dark:border-slate-800/80">
                      {(["pdf", "csv", "xlsx"] as const).map((format) => (
                        <Button key={format} type="button" variant="ghost" size="sm" className="h-8 px-1 text-[11px]" aria-label={`Exportar grupo ${group.name} em ${format === "xlsx" ? "Excel" : format.toUpperCase()}`} onClick={(event) => { event.stopPropagation(); openGroupExportDialog(group.id, format); }}>
                          {format === "xlsx" ? "Excel" : format.toUpperCase()}
                        </Button>
                      ))}
                    </div>
                  )}
                </Card>
              );
            };

            const renderGuestCard = () => {
              const guestMembers = allMembers.filter(m => Boolean(m?.isGuest) || (guestGroup && m?.groupId === guestGroup.id));
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
                  {canExportMembers && (
                    <div className="mt-3 grid grid-cols-3 gap-1 border-t border-slate-100 pt-2 dark:border-slate-800/80">
                      {(["pdf", "csv", "xlsx"] as const).map((format) => (
                        <Button key={format} type="button" variant="ghost" size="sm" className="h-8 px-1 text-[11px]" aria-label={`Exportar convidados em ${format === "xlsx" ? "Excel" : format.toUpperCase()}`} onClick={(event) => { event.stopPropagation(); openGroupExportDialog("guests", format); }}>
                          {format === "xlsx" ? "Excel" : format.toUpperCase()}
                        </Button>
                      ))}
                    </div>
                  )}
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
              {safeGroups.map((grp) => (
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
                  {safeGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
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
                {safeGroups.filter((group) => group.criteria !== "special:guest").map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
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

        {importDialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="member-import-title">
            <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-800 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 id="member-import-title" className="text-xl font-semibold text-slate-900 dark:text-white">Importar membros em massa</h2>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Carregue um CSV ou Excel, reveja as linhas e confirme apenas depois de validar os dados.</p>
                </div>
                <Button type="button" size="icon" variant="ghost" aria-label="Fechar importação" onClick={resetImportDialog}><X className="h-5 w-5" /></Button>
              </div>

              {importStep === "select" && <div className="mt-5 grid gap-4 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/60 p-4 dark:border-emerald-800 dark:bg-emerald-950/20 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">Selecione o ficheiro de membros</p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Formatos aceites: CSV, XLSX e XLS. Limite: 500 linhas e 5 MB.</p>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Colunas reconhecidas: {MEMBER_IMPORT_COLUMNS.slice(0, 6).map((column) => column.label).join(", ")} e outras do modelo.</p>
                </div>
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  <label className="inline-flex cursor-pointer items-center rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 focus-within:ring-2 focus-within:ring-emerald-500">
                    <Upload className="mr-2 h-4 w-4" /> Escolher ficheiro
                    <input type="file" className="sr-only" accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" onChange={handleImportFile} disabled={importLoading || bulkImportMutation.isPending} />
                  </label>
                  <Button type="button" variant="outline" onClick={downloadImportTemplate}><FileDown className="mr-2 h-4 w-4" /> Modelo Excel</Button>
                </div>
              </div>}

              {!importLoading && importFileName && importStep === "preview" && <div className="mt-4 flex flex-col gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-900/60 dark:bg-sky-950/20 sm:flex-row sm:items-center sm:justify-between" role="region" aria-labelledby="member-import-preview-title"><div><h3 id="member-import-preview-title" className="font-semibold text-sky-950 dark:text-sky-100">Pré-visualização antes da confirmação</h3><p className="mt-1 text-sm text-sky-800 dark:text-sky-200">{importFileName} · reveja o resumo e confirme apenas quando os dados estiverem corretos.</p></div><Button type="button" size="sm" variant="outline" onClick={chooseAnotherImportFile} disabled={bulkImportMutation.isPending}><Upload className="mr-2 h-4 w-4" /> Escolher outro ficheiro</Button></div>}

              {(importLoading || bulkImportMutation.isPending) && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/20" role="status" aria-live="polite"><div className="flex items-center justify-between gap-3 text-sm"><div className="flex items-center gap-2 font-medium text-emerald-900 dark:text-emerald-200"><span className="inline-flex h-5 w-5 items-center justify-center rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" aria-hidden="true" />{importPhase === "reading" ? "A ler o ficheiro…" : importPhase === "validating" ? "A validar linhas e duplicados…" : "A enviar membros para o sistema…"}</div><span className="font-semibold tabular-nums text-emerald-800 dark:text-emerald-300">{importProgress}%</span></div><div className="mt-3 h-2.5 overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-950/60" role="progressbar" aria-label="Progresso da importação" aria-valuemin={0} aria-valuemax={100} aria-valuenow={importProgress}><div className="h-full rounded-full bg-emerald-600 transition-[width] duration-300 ease-out motion-safe:animate-pulse" style={{ width: `${importProgress}%` }} /></div><p className="mt-2 text-xs text-emerald-700 dark:text-emerald-300">Pode continuar nesta janela; não feche o modal enquanto o processamento estiver em curso.</p></div>}

              {importStep === "preview" && !importLoading && <div className="mb-2 mt-5 flex items-center justify-between gap-3"><div><p className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Resumo da validação</p><p className="text-sm text-slate-600 dark:text-slate-300">As linhas válidas serão importadas; as inválidas serão ignoradas e podem ser descarregadas no relatório.</p></div><span className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-200 sm:inline-flex">Confirmação manual necessária</span></div>}

                                {(importRows.length > 0 || importInvalidRows.length > 0 || importCompleted) && (

                <div className="mt-4 space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/20"><div className="flex items-center gap-2 text-sm font-medium text-emerald-800 dark:text-emerald-300"><CheckCircle2 className="h-4 w-4" /> Prontas</div><p className="mt-1 text-2xl font-bold text-emerald-900 dark:text-emerald-200">{importRows.length}</p></div>
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/20"><div className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-300"><AlertTriangle className="h-4 w-4" /> Com problemas</div><p className="mt-1 text-2xl font-bold text-amber-900 dark:text-amber-200">{importInvalidRows.length}</p></div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/30"><div className="text-sm font-medium text-slate-600 dark:text-slate-300">Total analisado</div><p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{importRows.length + importInvalidRows.length}</p></div>
                  </div>

                  {importCompleted && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-200"><p className="font-semibold">Importação concluída. As linhas válidas foram gravadas e as linhas rejeitadas permanecem disponíveis para descarregamento.</p></div>}

                  {importInvalidRows.length > 0 && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-200"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="font-semibold">As linhas com problemas não foram importadas.</p><p className="mt-1 text-xs text-amber-800 dark:text-amber-300">Clique em editar para corrigir os campos e validar novamente a linha.</p></div><div className="flex shrink-0 flex-wrap gap-2"><Button type="button" size="sm" variant="outline" onClick={() => downloadRejectedReport("csv")}><FileText className="mr-2 h-4 w-4" /> CSV</Button><Button type="button" size="sm" variant="outline" onClick={() => downloadRejectedReport("xlsx")}><FileSpreadsheet className="mr-2 h-4 w-4" /> Excel</Button></div></div><ul className="mt-3 max-h-72 space-y-2 overflow-y-auto">{importInvalidRows.slice(0, 12).map((row) => <li key={row.sourceRow} className="rounded-lg border border-amber-200/80 bg-white/70 p-3 dark:border-amber-900/70 dark:bg-slate-900/30">{editingInvalidRow === row.sourceRow ? <div className="space-y-3"><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-medium">Nome<input aria-label={`Nome da linha ${row.sourceRow}`} value={row.name} onChange={(event) => updateInvalidRowField(row.sourceRow, "name", event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white" /></label><label className="text-xs font-medium">Sexo<select aria-label={`Sexo da linha ${row.sourceRow}`} value={row.sex} onChange={(event) => updateInvalidRowField(row.sourceRow, "sex", event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white"><option value="">Selecionar…</option><option value="M">M</option><option value="F">F</option></select></label><label className="text-xs font-medium">Data de nascimento<input aria-label={`Data de nascimento da linha ${row.sourceRow}`} type="date" value={row.birthDate ?? ""} onChange={(event) => updateInvalidRowField(row.sourceRow, "birthDate", event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white" /></label><label className="text-xs font-medium">Email<input aria-label={`Email da linha ${row.sourceRow}`} type="email" value={row.email ?? ""} onChange={(event) => updateInvalidRowField(row.sourceRow, "email", event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white" /></label><label className="text-xs font-medium">Cargo eclesiástico<input aria-label={`Cargo da linha ${row.sourceRow}`} value={row.position ?? ""} onChange={(event) => updateInvalidRowField(row.sourceRow, "position", event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white" /></label><label className="text-xs font-medium">Grupo<select aria-label={`Grupo da linha ${row.sourceRow}`} value={row.groupId ? String(row.groupId) : ""} onChange={(event) => updateInvalidRowGroup(row.sourceRow, event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white"><option value="">Sem grupo</option>{safeGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label></div><div className="flex flex-wrap justify-end gap-2"><Button type="button" size="sm" variant="outline" onClick={() => setEditingInvalidRow(null)}>Cancelar</Button><Button type="button" size="sm" onClick={() => revalidateInvalidRow(row.sourceRow)} className="bg-emerald-600 text-white hover:bg-emerald-700">Guardar e validar linha</Button></div></div> : <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><p className="font-medium">Linha {row.sourceRow}</p><p className="mt-1 text-xs text-red-700 dark:text-red-300">{row.errors.join(" ")}</p></div><Button type="button" size="sm" variant="outline" onClick={() => setEditingInvalidRow(row.sourceRow)}>Editar linha</Button></div>}</li>)}{importInvalidRows.length > 12 && <li className="text-xs">… e mais {importInvalidRows.length - 12} linha(s). Descarregue o relatório para consultar todas.</li>}</ul></div>}

                  {importRows.length > 0 && <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-900/50 dark:text-slate-400"><tr><th className="px-3 py-2">Linha</th><th className="px-3 py-2">Nome</th><th className="px-3 py-2">Sexo</th><th className="px-3 py-2">Grupo</th><th className="px-3 py-2">Cargo</th><th className="px-3 py-2">Convidado</th></tr></thead><tbody>{importRows.slice(0, 8).map((row) => <tr key={row.sourceRow} className="border-t border-slate-100 dark:border-slate-700"><td className="px-3 py-2 text-slate-500">{row.sourceRow}</td><td className="px-3 py-2 font-medium text-slate-900 dark:text-white">{row.name}</td><td className="px-3 py-2">{row.sex}</td><td className="px-3 py-2">{row.groupName || "Automático"}</td><td className="px-3 py-2">{row.position || "Membro"}</td><td className="px-3 py-2">{row.isGuest ? "Sim" : "Não"}</td></tr>)}</tbody></table>{importRows.length > 8 && <p className="border-t border-slate-100 px-3 py-2 text-xs text-slate-500 dark:border-slate-700">A mostrar 8 de {importRows.length} linhas válidas. Todas serão importadas após confirmação.</p>}</div>}
                </div>
              )}

              <div className="mt-6 flex flex-col-reverse justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-700 sm:flex-row">
                <Button type="button" variant="outline" onClick={resetImportDialog} disabled={bulkImportMutation.isPending}>Cancelar</Button>
                {importRows.length > 0 && <Button type="button" onClick={confirmImport} disabled={importLoading || bulkImportMutation.isPending} className="bg-emerald-600 text-white hover:bg-emerald-700">{bulkImportMutation.isPending ? "A importar…" : `Confirmar e importar ${importRows.length} linha(s) válida(s)`}</Button>}
              </div>
            </div>
          </div>
        )}

        <ExportColumnDialog open={exportDialogOpen} onOpenChange={setExportDialogOpen} title={`Exportar membros em ${pendingExportFormat.toUpperCase()}`} description="Escolha as colunas que pretende incluir no ficheiro. A pesquisa actual será mantida." columns={MEMBER_EXPORT_COLUMNS} selected={selectedExportColumns} askPersonalData defaultIncludePersonalData={false} onConfirm={(columns, includePersonalData) => { setSelectedExportColumns(columns); void exportMembers(columns, includePersonalData); }} confirmLabel={`Exportar ${pendingExportFormat.toUpperCase()}`} isSubmitting={exportingFormat !== null} />

        {/* Barra de Ação em Massa */}
        <div className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <input type="checkbox" aria-label="Selecionar todos os membros visíveis" checked={filteredMembers && filteredMembers.length > 0 && selectedMemberIds.length === filteredMembers.length} onChange={toggleSelectAll} className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {selectedMemberIds.length > 0 ? `${selectedMemberIds.length} membro(s) selecionado(s)` : "Selecionar todos os visíveis"}
            </span>
          </div>
          {selectedMemberIds.length > 0 && (
            <div className="flex items-center gap-2">
              <select aria-label="Grupo de destino para mover membros selecionados" value={bulkTargetGroupId} onChange={(e) => setBulkTargetGroupId(e.target.value ? Number(e.target.value) : '')} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white">
                <option value="">Selecionar grupo de destino…</option>
                {safeGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              <Button type="button" size="sm" disabled={!bulkTargetGroupId || bulkMoveMutation.isPending} onClick={() => setBulkMoveModalOpen(true)} className="bg-emerald-600 text-white hover:bg-emerald-700">
                Mover selecionados
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setSelectedMemberIds([])}>
                Cancelar seleção
              </Button>
            </div>
          )}
        </div>

        {/* Modal de Confirmação de Ação em Massa */}
        {bulkMoveModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-slate-800">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Confirmar transferência em massa</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Tem a certeza de que pretende mover <strong className="text-emerald-600">{selectedMemberIds.length}</strong> membro(s) selecionado(s) para o grupo <strong className="text-emerald-600">{safeGroups.find(g => g.id === bulkTargetGroupId)?.name}</strong>?
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setBulkMoveModalOpen(false)}>Cancelar</Button>
                <Button type="button" disabled={bulkMoveMutation.isPending} onClick={() => bulkMoveMutation.mutate({ memberIds: selectedMemberIds, targetGroupId: Number(bulkTargetGroupId) })} className="bg-emerald-600 text-white hover:bg-emerald-700">
                  {bulkMoveMutation.isPending ? "A mover…" : "Confirmar e Mover"}
                </Button>
              </div>
            </div>
          </div>
        )}

        <motion.div className="grid grid-cols-1 gap-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {isLoading ? <div className="py-8 text-center text-slate-500">A carregar membros…</div> : filteredMembers && filteredMembers.length > 0 ? filteredMembers.map((member, index) => (
            <motion.div key={member.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }}>
              <Card className="border-slate-200 bg-white p-4 transition-shadow hover:shadow-lg dark:border-slate-700 dark:bg-slate-800"><div className="flex items-start justify-between gap-3"><div className="flex items-center pt-1"><input type="checkbox" aria-label={`Selecionar ${member.name}`} checked={selectedMemberIds.includes(member.id)} onChange={() => toggleSelectMember(member.id)} className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" /></div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><RecordIdBadge id={member.id} /><h3 className="font-semibold text-slate-900 dark:text-white">{member.name}</h3>{member.isGuest && <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">Convidado</span>}</div><p className="text-sm text-slate-600 dark:text-slate-400">{member.position || "Sem cargo"} · {member.sex === "M" ? "Masculino" : "Feminino"} · Idade: {calculateAge(member.birthDate) === null ? "—" : `${calculateAge(member.birthDate)} anos`} · Grupo: {safeGroups.find((g) => g.id === member.groupId)?.name || "Geral"}</p>
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
