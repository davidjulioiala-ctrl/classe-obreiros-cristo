import { LogOut, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import TwoFactorSettings from "@/components/TwoFactorSettings";
import { useLocalAuth } from "@/_core/hooks/useLocalAuth";

/**
 * Bloqueia a navegação de uma sessão autenticada mas ainda pendente de 2FA.
 * O utilizador pode apenas concluir a configuração ou terminar a sessão.
 */
export default function TwoFactorRequiredGate() {
  const { logout } = useLocalAuth();

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/20 sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-3">
              <div className="rounded-xl bg-amber-500 p-2 text-white"><ShieldAlert className="h-6 w-6" /></div>
              <div>
                <h1 className="text-xl font-bold sm:text-2xl">Configuração de segurança obrigatória</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-700 dark:text-slate-300">Para proteger os dados da organização, complete a configuração da autenticação de dois factores antes de aceder aos menus, formulários ou relatórios.</p>
              </div>
            </div>
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => void logout()}>
              <LogOut className="mr-2 h-4 w-4" />Terminar sessão
            </Button>
          </div>
        </section>
        <TwoFactorSettings />
      </div>
    </main>
  );
}
