import { motion } from "framer-motion";
import { Mail, ShieldCheck, UserCircle, Settings, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import DashboardLayoutCustom from "@/components/DashboardLayoutCustom";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Profile() {
  const { user } = useAuth();
  const roleLabel = user?.churchRole === "lider" ? "Líder" : user?.churchRole === "oficial" ? "Oficial" : "Líder de Louvor";

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
