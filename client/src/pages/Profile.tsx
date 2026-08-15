import { useState, useEffect } from "react";
import { Mail, ShieldCheck, UserCircle, Settings, ArrowRight, Lock, KeyRound, Loader2, User } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import DashboardLayoutCustom from "@/components/DashboardLayoutCustom";
import TwoFactorSettings from "@/components/TwoFactorSettings";
import { useLocalAuth } from "@/_core/hooks/useLocalAuth";
import { trpc } from "@/lib/trpc";

export default function Profile() {
  const { user, refresh } = useLocalAuth();
  const roleLabel = user?.churchRole === "lider" ? "Líder" : user?.churchRole === "oficial" ? "Oficial" : "Líder de Louvor";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setEmail(user.email ?? "");
    }
  }, [user]);

  const updateProfileMutation = trpc.auth.updateProfile.useMutation({
    onSuccess: async () => {
      await refresh();
      toast.success("Perfil atualizado com sucesso.");
    },
    onError: (err) => toast.error(err.message || "Erro ao atualizar perfil."),
  });

  const changePasswordMutation = trpc.auth.changePassword.useMutation({
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Senha alterada com sucesso.");
    },
    onError: (err) => toast.error(err.message || "Erro ao alterar senha."),
  });

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("O nome não pode estar vazio.");
      return;
    }
    updateProfileMutation.mutate({ name: name.trim(), email: email.trim() });
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error("Insira a senha atual.");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("A nova senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("A confirmação da nova senha não coincide.");
      return;
    }
    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

  return (
    <DashboardLayoutCustom>
      <motion.div
        className="mx-auto w-full max-w-4xl space-y-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">Conta</p>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-white">Meu perfil</h1>
          <p className="mt-1 text-sm text-slate-600 sm:text-base dark:text-slate-400">Consulte os seus dados de acesso e o papel atribuído na organização.</p>
        </div>

        <Card className="border-0 shadow-sm dark:bg-slate-800">
          <CardHeader className="flex flex-col gap-4 border-b border-slate-100 sm:flex-row sm:items-center dark:border-slate-700">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-900/30">
              <UserCircle className="h-9 w-9 text-emerald-600 dark:text-emerald-300" />
            </div>
            <div className="min-w-0">
              <CardTitle className="truncate text-xl text-slate-900 dark:text-white">{user?.name || "Utilizador"}</CardTitle>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{roleLabel}</p>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 pt-6 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900/60">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                <UserCircle className="h-4 w-4 text-emerald-600" /> Utilizador
              </div>
              <p className="break-words text-sm text-slate-900 dark:text-white">{user?.username || "—"}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900/60">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                <Mail className="h-4 w-4 text-emerald-600" /> Email
              </div>
              <p className="break-words text-sm text-slate-900 dark:text-white">{user?.email || "Não definido"}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900/60">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                <ShieldCheck className="h-4 w-4 text-emerald-600" /> Papel de acesso
              </div>
              <p className="text-sm text-slate-900 dark:text-white">{roleLabel}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm dark:bg-slate-800">
          <CardHeader>
            <CardTitle className="text-xl text-slate-900 dark:text-white">Editar Dados Pessoais</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Nome completo</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="O seu nome" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" />
              </div>
              <Button type="submit" disabled={updateProfileMutation.isPending} className="bg-emerald-600 text-white hover:bg-emerald-700">
                {updateProfileMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <User className="mr-2 h-4 w-4" />}
                Guardar alterações do perfil
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm dark:bg-slate-800">
          <CardHeader>
            <CardTitle className="text-xl text-slate-900 dark:text-white">Alterar Senha</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Senha atual</label>
                <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Nova senha (mínimo 8 caracteres)</label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Confirmar nova senha</label>
                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" />
              </div>
              <Button type="submit" disabled={changePasswordMutation.isPending} className="bg-emerald-600 text-white hover:bg-emerald-700">
                {changePasswordMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                Alterar senha
              </Button>
            </form>
          </CardContent>
        </Card>

        <TwoFactorSettings />

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/settings" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full sm:w-auto">
              <Settings className="mr-2 h-4 w-4" />
              Abrir configurações
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </motion.div>
    </DashboardLayoutCustom>
  );
}
