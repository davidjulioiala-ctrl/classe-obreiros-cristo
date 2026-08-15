import { LogOut, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import TwoFactorSettings from "@/components/TwoFactorSettings";
import type { LocalUser } from "@/_core/hooks/useLocalAuth";

interface MandatoryTwoFactorGateProps {
  user: LocalUser;
  logout: () => Promise<void>;
}

export default function MandatoryTwoFactorGate({ user, logout }: MandatoryTwoFactorGateProps) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 dark:bg-slate-950 dark:text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-4xl items-center justify-center">
        <div className="w-full space-y-5">
          <Card className="border-amber-200 bg-amber-50 p-6 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/20">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-amber-600 p-3 text-white">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-bold">Configure a autenticação de dois factores</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700 dark:text-slate-300">
                  Olá, {user.name || user.username}. Para proteger todas as contas, a configuração do 2FA é obrigatória antes de utilizar o sistema. Siga os passos abaixo e confirme o código apresentado na sua aplicação autenticadora.
                </p>
                <p className="mt-2 text-sm font-semibold text-amber-800 dark:text-amber-200">O acesso às operações ficará disponível imediatamente após a confirmação.</p>
              </div>
            </div>
          </Card>

          <TwoFactorSettings />

          <div className="flex justify-end">
            <Button type="button" variant="outline" onClick={() => void logout()} className="gap-2">
              <LogOut className="h-4 w-4" /> Terminar sessão
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
