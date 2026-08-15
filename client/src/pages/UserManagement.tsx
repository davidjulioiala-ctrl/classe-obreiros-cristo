import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Edit2, Eye, EyeOff, Loader2, Plus, Search, ShieldCheck, Trash2, UsersRound, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DashboardLayoutCustom from "@/components/DashboardLayoutCustom";
import { RecordIdBadge } from "@/components/RecordIdBadge";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import * as QRCode from "qrcode";

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
  return churchRoles.some((role) => role.value === value);
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
};

const emptyForm: FormData = {
  username: "",
  password: "",
  name: "",
  email: "",
  role: "user",
  churchRole: "membro",
  isActive: true,
};

export default function UserManagement() {
  const utils = trpc.useUtils();
  const { user: currentUser, refresh } = useAuth();
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

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [twoFactorSetup, setTwoFactorSetup] = useState<TwoFactorSetup | null>(null);
  const [twoFactorQrCode, setTwoFactorQrCode] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorBusy, setTwoFactorBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!twoFactorSetup) {
      setTwoFactorQrCode(null);
      return () => {
        cancelled = true;
      };
    }
    try {
      const qrGenerator = QRCode as typeof import("qrcode");
      if (typeof qrGenerator.toDataURL !== "function") {
        throw new Error("QR_CODE_UNAVAILABLE");
      }
      void qrGenerator.toDataURL(twoFactorSetup.otpauthUri, {
        width: 240,
        margin: 2,
        errorCorrectionLevel: "M",
      })
        .then((dataUrl) => {
          if (!cancelled) setTwoFactorQrCode(dataUrl);
        })
        .catch(() => {
          if (!cancelled) setTwoFactorQrCode(null);
        });
    } catch {
      setTwoFactorQrCode(null);
    }
    return () => {
      cancelled = true;
    };
  }, [twoFactorSetup]);

  async function copyTwoFactorValue(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copiado.`);
    } catch {
      toast.error(`Não foi possível copiar ${label.toLowerCase()}. Utilize a opção manual apresentada.`);
    }
  }

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
    });
    setDialogOpen(true);
  }

  async function twoFactorRequest(path: string, body?: Record<string, string>) {
    const response = await fetch(path, {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401) throw new Error("A sua sessão expirou. Entre novamente e tente activar o 2FA.");
      if (response.status === 403) throw new Error(data.error || "A sessão não foi autorizada para configurar o 2FA.");
      throw new Error(data.error || data.message || "Não foi possível concluir a operação 2FA.");
    }
    return data as TwoFactorSetup & { success: boolean; twoFactorEnabled?: boolean };
  }

  function normalizeTwoFactorInput(value: string) {
    return value.replace(/[^0-9]/g, "").slice(0, 6);
  }

  async function startTwoFactorSetup() {
    setTwoFactorBusy(true);
    try {
      await refresh();
      const data = await twoFactorRequest("/api/auth/2fa/setup");
      setTwoFactorSetup({ secret: data.secret, otpauthUri: data.otpauthUri, recoveryCodes: data.recoveryCodes });
      toast.success("Configuração 2FA preparada. Guarde os códigos de recuperação.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível iniciar o 2FA.");
    } finally {
      setTwoFactorBusy(false);
    }
  }

  async function confirmTwoFactorSetup() {
    if (!twoFactorCode.trim()) {
      toast.error("Introduza o código actual da aplicação autenticadora.");
      return;
    }
    setTwoFactorBusy(true);
    try {
      const data = await twoFactorRequest("/api/auth/2fa/confirm", { code: normalizeTwoFactorInput(twoFactorCode) });
      if (!data.twoFactorEnabled) throw new Error("O servidor não confirmou a activação do 2FA. Tente novamente.");
      setTwoFactorSetup(null);
      setTwoFactorCode("");
      await refresh();
      toast.success("2FA activado para a conta administrativa.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível activar o 2FA.");
    } finally {
      setTwoFactorBusy(false);
    }
  }

  async function disableTwoFactorSetup() {
    if (!twoFactorCode.trim()) {
      toast.error("Introduza o código actual para desactivar o 2FA.");
      return;
    }
    setTwoFactorBusy(true);
    try {
      await twoFactorRequest("/api/auth/2fa/disable", { code: twoFactorCode });
      setTwoFactorCode("");
      await refresh();
      toast.success("2FA desactivado. A sessão foi renovada com segurança.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível desactivar o 2FA.");
    } finally {
      setTwoFactorBusy(false);
    }
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
    if (!editingUser && formData.password.length < 8) {
      toast.error("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (editingUser) {
      if (formData.password && formData.password.length < 8) {
        toast.error("A senha deve ter pelo menos 8 caracteres.");
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
    });
  }

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    const users = (usersQuery.data ?? []) as UserItem[];
    if (!term) return users;
    return users.filter((user) =>
      [user.username, user.name ?? "", user.email ?? "", user.churchRole]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [search, usersQuery.data]);

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
          <Button onClick={() => openDialog()} className="w-full bg-emerald-600 text-white hover:bg-emerald-700 sm:w-auto">
            <Plus className="mr-2 h-4 w-4" /> Novo utilizador
          </Button>
        </div>

        {currentUser?.role === "admin" && (
          <Card className="border-emerald-200 bg-emerald-50/70 p-5 dark:border-emerald-900/50 dark:bg-emerald-950/20">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex gap-3">
                <div className="rounded-xl bg-emerald-600 p-2 text-white"><ShieldCheck className="h-5 w-5" /></div>
                <div>
                  <h2 className="font-semibold text-slate-900 dark:text-white">Protecção em dois passos</h2>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">Opcional para administradores. O segredo é cifrado no servidor e os códigos de recuperação são guardados apenas como hashes de uso único.</p>
                  <p className="mt-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">Estado: {currentUser.twoFactorEnabled ? "Activo" : "Não configurado"}</p>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row lg:shrink-0">
                {!currentUser.twoFactorEnabled && !twoFactorSetup && <Button onClick={() => void startTwoFactorSetup()} disabled={twoFactorBusy} className="bg-emerald-600 text-white hover:bg-emerald-700">{twoFactorBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}Configurar 2FA</Button>}
                {currentUser.twoFactorEnabled && <Button variant="outline" onClick={() => void disableTwoFactorSetup()} disabled={twoFactorBusy || !twoFactorCode.trim()} className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30">{twoFactorBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Desactivar 2FA</Button>}
              </div>
            </div>
            {currentUser.twoFactorEnabled && (
              <div className="mt-4 max-w-md"><label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Código para desactivar</label><Input value={twoFactorCode} onChange={(event) => setTwoFactorCode(normalizeTwoFactorInput(event.target.value))} inputMode="numeric" autoComplete="one-time-code" placeholder="Código de 6 dígitos" maxLength={6} /></div>
            )}
            {twoFactorSetup && (
              <div className="mt-5 grid gap-5 border-t border-emerald-200 pt-5 dark:border-emerald-900/50 lg:grid-cols-[240px_minmax(0,1fr)]">
                <div className="flex flex-col items-center gap-3 rounded-xl bg-white p-4 text-center dark:bg-slate-900">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">1. Leia o QR Code</p>
                  {twoFactorQrCode ? <img src={twoFactorQrCode} alt="QR Code para configurar a autenticação de dois fatores" className="h-[210px] w-[210px] rounded-lg border border-slate-200 bg-white p-2" /> : <div className="flex h-[210px] w-[210px] items-center justify-center rounded-lg border border-dashed border-slate-300 text-xs text-slate-500">A gerar QR Code…</div>}
                  <p className="text-xs leading-5 text-slate-600 dark:text-slate-400">Abra Google Authenticator, Microsoft Authenticator ou Authy e escolha adicionar uma conta.</p>
                </div>
                <div className="space-y-4 text-sm">
                  <div><p className="font-semibold text-slate-900 dark:text-white">2. Se não conseguir ler o QR Code</p><p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">Use a chave abaixo na opção de configuração manual da aplicação autenticadora.</p><div className="mt-2 flex gap-2"><code className="min-w-0 flex-1 break-all rounded-lg bg-white p-3 font-mono text-xs text-slate-800 dark:bg-slate-900 dark:text-slate-200">{twoFactorSetup.secret}</code><Button type="button" variant="outline" size="sm" onClick={() => void copyTwoFactorValue(twoFactorSetup.secret, "Segredo")}>Copiar</Button></div><details className="mt-2"><summary className="cursor-pointer text-xs font-medium text-emerald-700 dark:text-emerald-300">Mostrar URI completa</summary><div className="mt-2 flex gap-2"><code className="min-w-0 flex-1 break-all rounded-lg bg-white p-3 font-mono text-[11px] text-slate-700 dark:bg-slate-900 dark:text-slate-300">{twoFactorSetup.otpauthUri}</code><Button type="button" variant="outline" size="sm" onClick={() => void copyTwoFactorValue(twoFactorSetup.otpauthUri, "URI")}>Copiar</Button></div></details></div>
                  <div><p className="font-semibold text-slate-900 dark:text-white">3. Guarde os códigos de recuperação</p><div className="mt-2 grid grid-cols-2 gap-2 rounded-lg bg-white p-3 font-mono text-xs text-slate-800 dark:bg-slate-900 dark:text-slate-200">{twoFactorSetup.recoveryCodes.map((code) => <span key={code}>{code}</span>)}</div><p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-400">Cada código só pode ser usado uma vez e não será mostrado novamente depois desta configuração.</p></div>
                  <div><label className="mb-1 block font-medium text-slate-700 dark:text-slate-200">4. Introduza o código de 6 dígitos</label><Input value={twoFactorCode} onChange={(event) => setTwoFactorCode(normalizeTwoFactorInput(event.target.value))} inputMode="numeric" autoComplete="one-time-code" placeholder="Código de 6 dígitos" maxLength={6} /><p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Depois de introduzir o código atual, clique em Confirmar ativação.</p></div>
                  <div className="flex flex-wrap gap-2"><Button onClick={() => void confirmTwoFactorSetup()} disabled={twoFactorBusy || twoFactorCode.length !== 6} className="bg-emerald-600 text-white hover:bg-emerald-700">{twoFactorBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Confirmar ativação</Button><Button variant="outline" onClick={() => { setTwoFactorSetup(null); setTwoFactorQrCode(null); setTwoFactorCode(""); }}>Cancelar</Button></div>
                </div>
              </div>
            )}
          </Card>
        )}

        <Card className="border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar utilizador, nome, email ou função" className="pl-10" />
          </div>
        </Card>

        {usersQuery.isLoading ? (
          <Card className="flex items-center justify-center gap-3 p-12"><Loader2 className="h-5 w-5 animate-spin text-emerald-600" /> A carregar utilizadores…</Card>
        ) : usersQuery.isError ? (
          <Card className="p-8 text-center text-red-600">{usersQuery.error.message || "Não foi possível carregar os utilizadores."}</Card>
        ) : (
          <Card className="overflow-hidden border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[920px]">
                <thead className="bg-slate-50 dark:bg-slate-700"><tr>{["ID", "Utilizador", "Nome", "Email", "Função", "Papel", "Estado", "Ações"].map((heading) => <th key={heading} className="px-5 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-200">{heading}</th>)}</tr></thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-t border-slate-200 dark:border-slate-700">
                      <td className="px-5 py-4"><RecordIdBadge id={user.id} /></td><td className="px-5 py-4 font-semibold">@{user.username}</td>
                      <td className="px-5 py-4">{user.name || "—"}</td>
                      <td className="px-5 py-4">{user.email || "—"}</td>
                      <td className="px-5 py-4"><span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">{roleLabel(user.churchRole)}</span></td>
                      <td className="px-5 py-4">{user.role === "admin" ? "Administrador" : "Utilizador"}</td>
                      <td className="px-5 py-4">{user.isActive ? "Ativo" : "Inativo"}</td>
                      <td className="px-5 py-4"><div className="flex justify-end gap-2"><Button variant="outline" size="sm" onClick={() => openDialog(user)} aria-label={`Editar ${user.username}`}><Edit2 className="h-4 w-4" /></Button><Button variant="outline" size="sm" disabled={deleteUser.isPending} onClick={() => { if (confirm(`Eliminar ${user.username}?`)) deleteUser.mutate({ userId: user.id }); }} className="text-red-600" aria-label={`Eliminar ${user.username}`}><Trash2 className="h-4 w-4" /></Button></div></td>
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
            <div><label className="mb-1 block text-sm font-medium">Função eclesiástica</label><Select value={formData.churchRole} onValueChange={(value) => { if (isChurchRole(value)) setFormData((current) => ({ ...current, churchRole: value })); }}><SelectTrigger aria-label="Função eclesiástica"><SelectValue placeholder="Selecione a função eclesiástica" /></SelectTrigger><SelectContent>{churchRoles.map((role) => <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>)}</SelectContent></Select></div>
            <div><label className="mb-1 block text-sm font-medium">Papel no sistema</label><Select value={formData.role} onValueChange={(value) => { if (isSystemRole(value)) setFormData((current) => ({ ...current, role: value })); }}><SelectTrigger aria-label="Papel no sistema"><SelectValue placeholder="Seleccione o papel no sistema" /></SelectTrigger><SelectContent><SelectItem value="user">Utilizador</SelectItem><SelectItem value="admin">Administrador</SelectItem></SelectContent></Select><p className="mt-1 text-xs text-slate-500">Pode promover para administrador ou rebaixar para utilizador, respeitando a protecção da última conta administrativa.</p></div>
            <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={formData.isActive} onChange={(event) => setFormData({ ...formData, isActive: event.target.checked })} /> Utilizador ativo</label>
            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={closeDialog}><X className="mr-2 h-4 w-4" /> Cancelar</Button><Button type="button" disabled={saving} onClick={saveUser} className="bg-emerald-600 text-white hover:bg-emerald-700">{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{editingUser ? "Guardar alterações" : "Criar utilizador"}</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayoutCustom>
  );
}
