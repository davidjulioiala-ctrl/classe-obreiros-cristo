import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Home,
  LockKeyhole,
  RefreshCw,
  ServerCog,
  ShieldCheck,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";

export type PublicMaintenanceState = {
  enabled: boolean;
  reason?: string | null;
  incidentId?: number | null;
};

type StatusTone = "operational" | "maintenance" | "unknown";

type StatusView = {
  tone: StatusTone;
  label: string;
  title: string;
  description: string;
};

export function getSystemStatusView(
  state: PublicMaintenanceState | null,
  hasError: boolean,
  checking: boolean,
): StatusView {
  if (checking) {
    return {
      tone: "unknown",
      label: "Verificação em curso",
      title: "A consultar o estado do sistema",
      description: "Estamos a confirmar a disponibilidade actual. Esta página será actualizada assim que obtivermos uma resposta segura.",
    };
  }

  if (hasError || !state) {
    return {
      tone: "unknown",
      label: "Estado indisponível",
      title: "Não foi possível confirmar o estado",
      description: "O serviço de estado não respondeu. Tente novamente dentro de alguns instantes; esta mensagem não indica, por si só, perda de dados.",
    };
  }

  if (state.enabled) {
    return {
      tone: "maintenance",
      label: "Manutenção activa",
      title: "O sistema está temporariamente em manutenção",
      description: "As operações foram pausadas para proteger os dados e permitir uma actualização ou intervenção técnica controlada.",
    };
  }

  return {
    tone: "operational",
    label: "Operacional",
    title: "O sistema está operacional",
    description: "Não existe manutenção activa conhecida neste momento. Se encontrar uma falha, tente actualizar esta página e contacte o administrador.",
  };
}

const toneStyles: Record<StatusTone, { icon: string; pill: string }> = {
  operational: {
    icon: "bg-emerald-500/15 text-emerald-300",
    pill: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  },
  maintenance: {
    icon: "bg-amber-400/15 text-amber-300",
    pill: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  },
  unknown: {
    icon: "bg-slate-400/15 text-slate-300",
    pill: "border-slate-600 bg-slate-800/80 text-slate-200",
  },
};

export default function SystemStatus() {
  const [, setLocation] = useLocation();
  const [state, setState] = useState<PublicMaintenanceState | null>(null);
  const [checking, setChecking] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkState = useCallback(async (signal?: AbortSignal) => {
    setChecking(true);
    try {
      const response = await fetch("/api/maintenance", {
        credentials: "same-origin",
        cache: "no-store",
        signal,
      });
      if (!response.ok) throw new Error("status-endpoint-unavailable");
      const nextState = (await response.json()) as PublicMaintenanceState;
      setState({
        enabled: Boolean(nextState.enabled),
        reason: nextState.reason ?? null,
        incidentId: nextState.incidentId ?? null,
      });
      setHasError(false);
      setLastChecked(new Date());
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setHasError(true);
    } finally {
      if (!signal?.aborted) setChecking(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void checkState(controller.signal);
    const interval = window.setInterval(() => void checkState(), 15_000);

    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, [checkState]);

  const view = getSystemStatusView(state, hasError, checking);
  const styles = toneStyles[view.tone];
  const Icon =
    view.tone === "operational"
      ? CheckCircle2
      : view.tone === "maintenance"
        ? LockKeyhole
        : ServerCog;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-8 text-white sm:px-6 sm:py-12">
      <section className="w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900/95 p-6 shadow-2xl sm:p-10">
        <header className="flex flex-col items-center text-center">
          <div className={`flex h-16 w-16 items-center justify-center rounded-full ${styles.icon}`}>
            <Icon aria-hidden="true" className="h-8 w-8" />
          </div>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
            Classe Obreiros de Cristo
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Estado do sistema
          </h1>
          <span className={`mt-5 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold ${styles.pill}`}>
            {view.tone === "operational" ? <CheckCircle2 aria-hidden="true" className="h-4 w-4" /> : null}
            {view.tone === "maintenance" ? <LockKeyhole aria-hidden="true" className="h-4 w-4" /> : null}
            {view.tone === "unknown" ? <Clock3 aria-hidden="true" className="h-4 w-4" /> : null}
            {view.label}
          </span>
        </header>

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-950/55 p-5 text-center sm:p-6">
          <h2 className="text-xl font-semibold text-white sm:text-2xl">{view.title}</h2>
          <p className="mx-auto mt-3 max-w-xl leading-7 text-slate-300">{view.description}</p>
          {state?.enabled && state.reason ? (
            <div className="mt-5 rounded-xl border border-amber-400/20 bg-amber-400/10 p-4 text-left">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-200">Informação da manutenção</p>
              <p className="mt-2 text-sm leading-6 text-amber-50">{state.reason}</p>
            </div>
          ) : null}
          {state?.enabled && state.incidentId ? (
            <p className="mt-4 text-xs text-slate-500">Referência de incidente: #{state.incidentId}</p>
          ) : null}
          {lastChecked ? (
            <p className="mt-4 text-xs text-slate-500">
              Última verificação: {lastChecked.toLocaleTimeString("pt-PT")}
            </p>
          ) : null}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Button
            type="button"
            variant="outline"
            className="border-slate-700 bg-transparent text-slate-100 hover:bg-slate-800"
            onClick={() => void checkState()}
            disabled={checking}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${checking ? "animate-spin" : ""}`} />
            Verificar novamente
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-slate-700 bg-transparent text-slate-100 hover:bg-slate-800"
            onClick={() => setLocation("/")}
          >
            <Home className="mr-2 h-4 w-4" />
            Voltar ao sistema
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-slate-700 bg-transparent text-slate-100 hover:bg-slate-800"
            onClick={() => setLocation("/login")}
          >
            <ShieldCheck className="mr-2 h-4 w-4" />
            Ir para o login
          </Button>
        </div>

        <footer className="mt-8 border-t border-slate-800 pt-5 text-center text-xs leading-5 text-slate-500">
          A página consulta apenas o estado público do serviço. Não apresenta dados de membros, operações financeiras ou detalhes técnicos de segurança.
        </footer>
      </section>
    </main>
  );
}
