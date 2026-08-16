import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Edit2, Eye, EyeOff, FileText, Loader2, Lock, Plus, Search, ShieldCheck, Trash2, Unlock, UsersRound, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DashboardLayoutCustom from "@/components/DashboardLayoutCustom";
import { RecordIdBadge } from "@/components/RecordIdBadge";
import TwoFactorSettings from "@/components/TwoFactorSettings";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useLocalAuth } from "@/_core/hooks/useLocalAuth";

const churchRoles = [
  { value: "membro", label: "Membro" },
  { value: "louvor", label: "Líder de Louvor" },
  { value: "oficial", label: "Oficial" },
  { value: "financeiro", label: "Financeiro" },
  { value: "financeira", label: "Financeira" },
  { value: "lider", label: "Líder" },
] as const;

type ChurchRole = (typeof churchRoles)[number]["value"];
type SystemRole = "user" | "admin";
const systemRoles = ["user", "admin"] as const;

function isSystemRole(value: string): value is SystemRole {
  return systemRoles.includes(value as SystemRole);
}

function isChurchRole(value: string): value is ChurchRole {
  const normalized = value.trim().toLowerCase();
  return churchRoles.some((role) => role.value === normalized);
}

type UserItem = {
  id: number;
  username: string;
  name: string | null;
  email: string | null;
  role: SystemRole;
  churchRole: ChurchRole;
  isActive: boolean;
  createdAt: Date | string;
  twoFactorEnabled?: boolean;
};

type TwoFactorSetup = {
  secret: string;
  otpauthUri: string;
  recoveryCodes: string[];
};

type FormData = {
  username: string;
  password: string;
  name: string;
  email: string;
  role: SystemRole;
  churchRole: ChurchRole;
  isActive: boolean;
  suspendReason: string;
};

const emptyForm: FormData = {
  username: "",
  password: "",
  name: "",
  email: "",
  role: "user",
  churchRole: "membro",
  isActive: true,
  suspendReason: "",
};

export default function UserManagement() {
  const utils = trpc.useUtils();
  const { user: currentUser, refresh } = useLocalAuth();
  const usersQuery = trpc.auth.getAllUsers.useQuery(undefined, { retry: false });
  const createUser = trpc.auth.createUser.useMutation({
    onSuccess: async () => {
      await utils.auth.getAllUsers.invalidate();
      toast.success("Utilizador criado com sucesso.");
      closeDialog();
    },
    onError: (error) => toast.error(error.message || "Não foi possível criar o utilizador."),
  });
  const updateUser = trpc.auth.updateUser.useMutation({
    onSuccess: async () => {
      await utils.auth.getAllUsers.invalidate();
      toast.success("Utilizador atualizado com sucesso.");
      closeDialog();
    },
    onError: (error) => toast.error(error.message || "Não foi possível atualizar o utilizador."),
  });
  const deleteUser = trpc.auth.deleteUser.useMutation({
    onSuccess: async () => {
      await utils.auth.getAllUsers.invalidate();
      toast.success("Utilizador eliminado com sucesso.");
    },
    onError: (error) => toast.error(error.message || "Não foi possível eliminar o utilizador."),
  });
  const resetTwoFactor = trpc.auth.adminResetTwoFactor.useMutation({
    onSuccess: async () => {
      await utils.auth.getAllUsers.invalidate();
      toast.success("2FA redefinido com sucesso para o utilizador.");
    },
    onError: (error) => toast.error(error.message || "Não foi possível redefinir o 2FA."),
  });

  const twoFactorPolicyQuery = trpc.auth.getTwoFactorPolicy.useQuery();
  const setTwoFactorPolicy = trpc.auth.setTwoFactorPolicy.useMutation({
    onSuccess: async (data) => {
      await utils.auth.getTwoFactorPolicy.invalidate();
      toast.success(data.required ? "2FA obrigatório ativado para todos os utilizadores." : "2FA obrigatório desativado.");
    },
    onError: (error) => toast.error(error.message || "Não foi possível atualizar a política de 2FA."),
  });

  const [selectedAuditUserId, setSelectedAuditUserId] = useState<number | null>(null);
  const auditQuery = trpc.auth.getUserAuditHistory.useQuery(
    { userId: selectedAuditUserId ?? 0 },
    { enabled: !!selectedAuditUserId }
  );

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended">("all");
  const [twoFactorFilter, setTwoFactorFilter] = useState<"all" | "enabled" | "pending">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<FormData>(emptyForm);


  function closeDialog() {
    setDialogOpen(false);
    setEditingUser(null);
    setFormData(emptyForm);
    setShowPassword(false);
  }

  function openDialog(user?: UserItem) {
    if (!user) {
      setEditingUser(null);
      setFormData(emptyForm);
      setDialogOpen(true);
      return;
    }
    setEditingUser(user);
    const safeChurchRole = churchRoles.some((item) => item.value === user.churchRole) ? user.churchRole : "membro";
    setFormData({
      username: user.username,
      password: "",
      name: user.name ?? "",
      email: user.email ?? "",
      role: user.role === "admin" ? "admin" : "user",
      churchRole: safeChurchRole,
      isActive: user.isActive !== false,
      suspendReason: (user as any).suspendReason || "",
    });
    setDialogOpen(true);
  }



  function saveUser() {
    const username = formData.username.trim().toLowerCase();
    const name = formData.name.trim();
    const email = formData.email.trim();
    const safeUsername = username || editingUser?.username || "";
    const safeRole: SystemRole = isSystemRole(formData.role) ? formData.role : editingUser?.role === "admin" ? "admin" : "user";
    const safeChurchRole: ChurchRole = isChurchRole(formData.churchRole) ? formData.churchRole : "membro";

    if (!name || (!editingUser && (!safeUsername || !email))) {
      toast.error(editingUser ? "Preencha pelo menos o nome do utilizador." : "Preencha nome, email e utilizador.");
      return;
    }
    if (!editingUser && formData.password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (editingUser) {
      if (formData.password && formData.password.length < 6) {
        toast.error("A senha deve ter pelo menos 6 caracteres.");
        return;
      }
      updateUser.mutate({
        userId: editingUser.id,
        username: safeUsername,
        name,
        ...(email ? { email } : {}),
        role: safeRole,
        churchRole: safeChurchRole,
        isActive: formData.isActive,
        suspendReason: formData.isActive ? null : formData.suspendReason.trim() || null,
        ...(formData.password ? { password: formData.password } : {}),
      });
      return;
    }
    createUser.mutate({
      username: safeUsername,
      password: formData.password,
      name,
      email,
      role: safeRole,
      churchRole: safeChurchRole,
      isActive: formData.isActive,
      suspendReason: formData.isActive ? null : formData.suspendReason.trim() || null,
    });
  }

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    let users = (usersQuery.data ?? []) as UserItem[];
    if (statusFilter === "active") {
      users = users.filter((u) => u.isActive !== false);
    } else if (statusFilter === "suspended") {
      users = users.filter((u) => u.isActive === false);
    }
    if (twoFactorFilter === "enabled") {
      users = users.filter((u) => u.twoFactorEnabled === true);
    } else if (twoFactorFilter === "pending") {
      users = users.filter((u) => u.twoFactorEnabled !== true);
    }
    if (!term) return users;
    return users.filter((user) =>
      [user.username, user.name ?? "", user.email ?? "", user.churchRole]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [search, statusFilter, twoFactorFilter, usersQuery.data]);

  const saving = createUser.isPending || updateUser.isPending;
  const roleLabel = (value: string | null | undefined) => churchRoles.find((role) => role.value === value)?.label ?? "Membro";

  return (
    <DashboardLayoutCustom>
      <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">Administração</p>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Gestão de utilizadores</h1>
            <p className="mt-1 text-slate-600 dark:text-slate-400">Crie, edite, desative e remova acessos da plataforma.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={twoFactorPolicyQuery.data?.required ? "default" : "outline"}
              className={twoFactorPolicyQuery.data?.required ? "bg-emerald-600 text-white hover:bg-emerald-700" : ""}
              disabled={setTwoFactorPolicy.isPending}
              onClick={() => setTwoFactorPolicy.mutate({ required: !twoFactorPolicyQuery.data?.required })}
            >
              <ShieldCheck className="mr-2 h-4 w-4" /> {twoFactorPolicyQuery.data?.required ? "2FA Obrigatório Ativo" : "Tornar 2FA Obrigatório"}
            </Button>
            <Button variant="outline" onClick={() => {
              const rows = filteredUsers.map((u) => [u.id, u.username, u.name || "", u.email || "", roleLabel(u.churchRole), u.role === "admin" ? "Administrador" : "Utilizador", u.isActive ? "Ativo" : "Inativo", u.twoFactorEnabled ? "Ativo" : "Pendente"]);
              const csvContent = "\uFEFF" + [["ID", "Utilizador", "Nome", "Email", "Função", "Papel", "Estado", "2FA"], ...rows].map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(";")).join("\n");
              const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = `utilizadores-${new Date().toISOString().slice(0, 10)}.csv`;
              link.click();
              URL.revokeObjectURL(url);
              toast.success(`Exportados ${filteredUsers.length} utilizadores.`);
            }} className="w-full sm:w-auto">
              <FileText className="mr-2 h-4 w-4" /> Exportar CSV
            </Button>
            <Button onClick={() => openDialog()} className="w-full bg-emerald-600 text-white hover:bg-emerald-700 sm:w-auto">
              <Plus className="mr-2 h-4 w-4" /> Novo utilizador
            </Button>
          </div>
        </div>



        <Card className="border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar utilizador, nome, email ou função" className="pl-10" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Estado:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "suspended")}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                aria-label="Filtrar por estado da conta"
              >
                <option value="all">Todos os utilizadores</option>
                <option value="active">Apenas Ativos</option>
                <option value="suspended">Apenas Suspensos</option>
              </select>
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">2FA:</span>
              <select
                value={twoFactorFilter}
                onChange={(e) => setTwoFactorFilter(e.target.value as "all" | "enabled" | "pending")}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                aria-label="Filtrar por ativação do 2FA"
              >
                <option value="all">Todos</option>
                <option value="enabled">2FA ativo</option>
                <option value="pending">2FA pendente</option>
              </select>
            </div>
          </div>
        </Card>

        {usersQuery.isLoading ? (
          <Card className="flex items-center justify-center gap-3 p-12"><Loader2 className="h-5 w-5 animate-spin text-emerald-600" /> A carregar utilizadores…</Card>
        ) : usersQuery.isError ? (
          <Card className="p-8 text-center text-red-600">{usersQuery.error.message || "Não foi possível carregar os utilizadores."}</Card>
        ) : (
          <Card className="overflow-hidden border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[980px]">
                <thead className="bg-slate-50 dark:bg-slate-700"><tr>{["ID", "Utilizador", "Nome", "Email", "Função", "Papel", "Estado", "2FA", "Ações"].map((heading) => <th key={heading} className="px-4 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-200">{heading}</th>)}</tr></thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-t border-slate-200 dark:border-slate-700">
                      <td className="px-4 py-4"><RecordIdBadge id={user.id} /></td>
                      <td className="px-4 py-4 font-semibold">@{user.username}</td>
                      <td className="px-4 py-4">{user.name || "—"}</td>
                      <td className="px-4 py-4">{user.email || "—"}</td>
                      <td className="px-4 py-4"><span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">{roleLabel(user.churchRole)}</span></td>
                      <td className="px-4 py-4">{user.role === "admin" ? "Administrador" : "Utilizador"}</td>
                      <td className="px-4 py-4">
                        {user.isActive ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                            Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-medium text-rose-800 dark:bg-rose-900/30 dark:text-rose-300">
                            Suspenso
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {user.twoFactorEnabled ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                            Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                            Pendente
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-1.5">
                          <Button variant="outline" size="sm" onClick={() => openDialog(user)} aria-label={`Editar ${user.username}`}><Edit2 className="h-4 w-4" /></Button>
                          <Button
                            variant="outline"
                            size="sm"
                            title={user.isActive ? "Suspender utilizador" : "Reativar utilizador"}
                            onClick={() => {
                              const actionName = user.isActive ? "suspender" : "reativar";
                              if (confirm(`Tem certeza que deseja ${actionName} o utilizador ${user.username}?`)) {
                                updateUser.mutate({
                                  userId: user.id,
                                  isActive: !user.isActive,
                                });
                              }
                            }}
                            className={user.isActive ? "text-amber-600 hover:text-amber-700" : "text-emerald-600 hover:text-emerald-700"}
                          >
                            {user.isActive ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                          </Button>
                          {user.twoFactorEnabled && (
                            <Button variant="outline" size="sm" title="Redefinir / Desativar 2FA" onClick={() => { if (confirm(`Tem certeza que deseja redefinir/desativar o 2FA para ${user.username}?`)) resetTwoFactor.mutate({ userId: user.id }); }} className="text-amber-600 hover:text-amber-700"><ShieldCheck className="h-4 w-4" /></Button>
                          )}
                          <Button variant="outline" size="sm" title="Histórico de auditoria" onClick={() => setSelectedAuditUserId(user.id)} className="text-slate-600 hover:text-slate-900 dark:text-slate-300"><FileText className="h-4 w-4" /></Button>
                          <Button variant="outline" size="sm" disabled={deleteUser.isPending} onClick={() => { if (confirm(`Eliminar definitivamente ${user.username}?`)) deleteUser.mutate({ userId: user.id }); }} className="text-red-600" aria-label={`Eliminar ${user.username}`}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-3 p-4 md:hidden">
              {filteredUsers.map((user) => <div key={user.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><RecordIdBadge id={user.id} /><p className="truncate font-semibold">{user.name || user.username}</p><p className="truncate text-sm text-slate-500">@{user.username}</p></div><span className="shrink-0 text-xs font-semibold">{user.isActive ? "Ativo" : "Inativo"}</span></div><p className="mt-3 break-words text-sm text-slate-600 dark:text-slate-300">{user.email || "Sem email"}</p><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{roleLabel(user.churchRole)} · {user.role === "admin" ? "Administrador" : "Utilizador"}</p><div className="mt-4 flex gap-2"><Button className="flex-1" variant="outline" onClick={() => openDialog(user)}><Edit2 className="mr-2 h-4 w-4" /> Editar</Button><Button variant="outline" onClick={() => { if (confirm(`Eliminar ${user.username}?`)) deleteUser.mutate({ userId: user.id }); }} className="text-red-600"><Trash2 className="h-4 w-4" /></Button></div></div>)}
            </div>
            {!filteredUsers.length && <div className="p-12 text-center text-slate-500"><UsersRound className="mx-auto mb-3 h-8 w-8" />Nenhum utilizador encontrado.</div>}
          </Card>
        )}
      </motion.div>

      <Dialog open={dialogOpen} onOpenChange={(open) => open ? setDialogOpen(true) : closeDialog()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-800 sm:max-w-lg">
          <DialogHeader><DialogTitle>{editingUser ? "Editar utilizador" : "Novo utilizador"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><label className="mb-1 block text-sm font-medium">Utilizador (Código)</label><Input value={formData.username} onChange={(event) => setFormData({ ...formData, username: event.target.value })} placeholder="username" /></div>
            <div><label className="mb-1 block text-sm font-medium">Senha {editingUser ? "(opcional)" : ""}</label><div className="relative"><Input type={showPassword ? "text" : "password"} value={formData.password} onChange={(event) => setFormData({ ...formData, password: event.target.value })} placeholder={editingUser ? "Deixe em branco para manter" : "Mínimo de 6 caracteres"} className="pr-10" /><button type="button" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>
            <div><label className="mb-1 block text-sm font-medium">Nome</label><Input value={formData.name} onChange={(event) => setFormData({ ...formData, name: event.target.value })} placeholder="Nome completo" /></div>
            <div><label className="mb-1 block text-sm font-medium">Email</label><Input type="email" value={formData.email} onChange={(event) => setFormData({ ...formData, email: event.target.value })} placeholder="email@exemplo.com" /></div>
            <div>
              <label className="mb-1 block text-sm font-medium">Função eclesiástica</label>
              <select
                value={formData.churchRole}
                onChange={(event) => {
                  const val = event.target.value;
                  if (isChurchRole(val)) {
                    setFormData((current) => ({ ...current, churchRole: val }));
                  }
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {churchRoles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Papel no sistema</label>
              <select
                value={formData.role}
                onChange={(event) => {
                  const val = event.target.value;
                  if (isSystemRole(val)) {
                    setFormData((current) => ({ ...current, role: val }));
                  }
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="user">Utilizador</option>
                <option value="admin">Administrador</option>
              </select>
              <p className="mt-1 text-xs text-slate-500">Pode promover para administrador ou rebaixar para utilizador, respeitando a protecção da última conta administrativa.</p>
            </div>
            <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={formData.isActive} onChange={(event) => setFormData({ ...formData, isActive: event.target.checked })} /> Utilizador ativo</label>
            {!formData.isActive && (
              <div>
                <label className="mb-1 block text-sm font-medium">Motivo da suspensão (exclusivo para administradores)</label>
                <textarea
                  value={formData.suspendReason}
                  onChange={(event) => setFormData({ ...formData, suspendReason: event.target.value })}
                  placeholder="Descreva o motivo pelo qual a conta foi suspensa..."
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background p-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
            )}
            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={closeDialog}><X className="mr-2 h-4 w-4" /> Cancelar</Button><Button type="button" disabled={saving} onClick={saveUser} className="bg-emerald-600 text-white hover:bg-emerald-700">{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{editingUser ? "Guardar alterações" : "Criar utilizador"}</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={selectedAuditUserId !== null} onOpenChange={(open) => { if (!open) setSelectedAuditUserId(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-800 sm:max-w-xl">
          <DialogHeader><DialogTitle>Histórico de Auditoria do Utilizador</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {auditQuery.isLoading ? (
              <div className="flex items-center justify-center gap-2 py-8"><Loader2 className="h-5 w-5 animate-spin text-emerald-600" /> A carregar histórico...</div>
            ) : auditQuery.isError ? (
              <p className="text-sm text-red-600">Não foi possível carregar o histórico de auditoria.</p>
            ) : !auditQuery.data?.length ? (
              <p className="py-8 text-center text-sm text-slate-500">Nenhum registo de auditoria encontrado para este utilizador.</p>
            ) : (
              <div className="space-y-3">
                {auditQuery.data.map((log) => (
                  <div key={log.id} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
                    <div className="flex items-center justify-between font-medium text-slate-900 dark:text-white">
                      <span className="uppercase text-emerald-600 dark:text-emerald-400">{log.action}</span>
                      <span className="text-xs text-slate-500">{new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Responsável: <span className="font-semibold">{log.actorName}</span></p>
                    {log.details && (
                      <pre className="mt-2 overflow-x-auto rounded bg-slate-50 p-2 text-xs text-slate-700 dark:bg-slate-900 dark:text-slate-300">
                        {log.details}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => setSelectedAuditUserId(null)}>Fechar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayoutCustom>
  );
}
