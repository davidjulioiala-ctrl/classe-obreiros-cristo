import { useEffect, useState } from "react";
import { AlertTriangle, LockKeyhole, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

type MaintenanceState = {
  enabled: boolean;
  reason?: string;
  incidentId?: number | null;
};

type MaintenanceGateProps = {
  user: { role?: string } | null;
  children: React.ReactNode;
};

export default function MaintenanceGate({ user, children }: MaintenanceGateProps) {
  const [state, setState] = useState<MaintenanceState>({ enabled: false });
  const [checking, setChecking] = useState(true);

  const checkState = async () => {
    try {
      const response = await fetch("/api/maintenance", { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) throw new Error("maintenance-state-unavailable");
      setState((await response.json()) as MaintenanceState);
    } catch {
      // Do not trap users on a stale maintenance screen when the status endpoint is unavailable.
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    void checkState();
    const interval = window.setInterval(() => void checkState(), 15_000);
    const handleFocus = () => void checkState();
    window.addEventListener("focus", handleFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  if (checking || !state.enabled || user?.role === "admin") {
    return (
      <>
        {state.enabled && user?.role === "admin" && (
          <div className="sticky top-0 z-[60] flex flex-wrap items-center justify-between gap-x-3 gap-y-1 bg-amber-100 px-4 py-2 text-center text-sm text-amber-950 shadow-sm sm:text-left dark:bg-amber-950 dark:text-amber-100">
            <span className="flex min-w-0 items-center justify-center gap-2 sm:justify-start"><AlertTriangle className="h-4 w-4 shrink-0" /> <span>Modo de manutenção activo: as operações normais estão bloqueadas.</span></span>
            <a className="shrink-0 font-semibold underline" href="/audit-backup">Abrir consola de emergência</a>
          </div>
        )}
        {children}
      </>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-8 text-white sm:px-6 sm:py-12">
      <section className="w-full max-w-lg rounded-2xl border border-amber-400/30 bg-slate-900 p-6 text-center shadow-2xl sm:p-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-400/15 text-amber-300"><LockKeyhole className="h-8 w-8" /></div>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">Acesso temporariamente bloqueado</p>
        <h1 className="mt-3 text-2xl font-bold sm:text-3xl">Sistema em manutenção</h1>
        <p className="mt-4 leading-7 text-slate-300">As operações foram interrompidas para proteger os dados e permitir a investigação ou actualização do sistema.</p>
        {state.reason && <p className="mt-4 rounded-lg border border-slate-700 bg-slate-950/60 p-3 text-sm text-slate-200">Motivo: {state.reason}</p>}
        {state.incidentId && <p className="mt-3 text-xs text-slate-500">Incidente #{state.incidentId}</p>}
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap"><Button type="button" variant="outline" className="border-slate-600 text-slate-100 hover:bg-slate-800" onClick={() => void checkState()}><RefreshCw className="mr-2 h-4 w-4" />Verificar novamente</Button><a className="inline-flex h-10 items-center justify-center rounded-md border border-slate-600 px-4 text-sm font-medium text-slate-100 hover:bg-slate-800" href="/status">Ver estado do sistema</a><a className="inline-flex h-10 items-center justify-center rounded-md bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700" href="/login"><ShieldCheck className="mr-2 h-4 w-4" />Voltar ao login</a></div>
      </section>
    </main>
  );
}
