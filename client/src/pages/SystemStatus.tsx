import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Home,
  LockKeyhole,
  MessageCircleWarning,
  Paperclip,
  RefreshCw,
  Send,
  ServerCog,
  ShieldCheck,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

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
  const [reportOpen, setReportOpen] = useState(false);
  const [reportCategory, setReportCategory] = useState("operational");
  const [reportDescription, setReportDescription] = useState("");
  const [reporting, setReporting] = useState(false);
  const [reportResult, setReportResult] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [reportScreenshot, setReportScreenshot] = useState<File | null>(null);
  const screenshotInputRef = useRef<HTMLInputElement>(null);

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

  const handleScreenshotChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      setReportScreenshot(null);
      return;
    }

    const allowedTypes = ["image/png", "image/jpeg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      event.target.value = "";
      setReportScreenshot(null);
      setReportResult({ kind: "error", message: "Anexe apenas uma imagem PNG, JPEG ou WEBP." });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      event.target.value = "";
      setReportScreenshot(null);
      setReportResult({ kind: "error", message: "A captura deve ter no máximo 5 MB." });
      return;
    }

    setReportScreenshot(file);
    setReportResult(null);
  };

  const submitReport = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (reportDescription.trim().length < 10) {
      setReportResult({ kind: "error", message: "Descreva o problema com pelo menos 10 caracteres." });
      return;
    }

    setReporting(true);
    setReportResult(null);
    try {
      const formData = new FormData();
      formData.append("category", reportCategory);
      formData.append("description", reportDescription.trim());
      if (reportScreenshot) formData.append("screenshot", reportScreenshot, reportScreenshot.name);

      const response = await fetch("/api/status-report", {
        method: "POST",
        credentials: "same-origin",
        body: formData,
      });
      const payload = (await response.json().catch(() => ({}))) as { success?: boolean; reference?: string; error?: string };
      if (!response.ok || !payload.success) throw new Error(payload.error || "Não foi possível enviar o reporte.");
      setReportDescription("");
      setReportScreenshot(null);
      if (screenshotInputRef.current) screenshotInputRef.current.value = "";
      setReportResult({ kind: "success", message: `Reporte registado. Referência: ${payload.reference ?? "atribuída pelo sistema"}.` });
    } catch (error) {
      setReportResult({ kind: "error", message: error instanceof Error ? error.message : "Não foi possível enviar o reporte neste momento." });
    } finally {
      setReporting(false);
    }
  };

  const organizationQuery = trpc.settings.getPublicOrganization.useQuery();
  const organizationName = organizationQuery.data?.organizationName ?? "Sistema de Gestão Eclesiástica";
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
            {organizationName}
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

        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/35 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-base font-semibold text-white"><MessageCircleWarning aria-hidden="true" className="h-5 w-5 text-amber-300" />Encontrou um problema?</h2>
              <p className="mt-1 text-sm leading-6 text-slate-400">Envie um relato rápido para a equipa responsável analisar a situação.</p>
            </div>
            <Button type="button" variant="outline" className="border-amber-400/30 bg-transparent text-amber-100 hover:bg-amber-400/10" onClick={() => { setReportOpen((open) => !open); setReportResult(null); }}>
              <MessageCircleWarning className="mr-2 h-4 w-4" />{reportOpen ? "Fechar reporte" : "Reportar problema"}
            </Button>
          </div>

          {reportOpen ? (
            <form className="mt-5 space-y-4 border-t border-slate-800 pt-5" onSubmit={(event) => void submitReport(event)}>
              <div>
                <label htmlFor="status-report-category" className="text-sm font-medium text-slate-200">Tipo de problema</label>
                <select id="status-report-category" value={reportCategory} onChange={(event) => setReportCategory(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20">
                  <option value="operational">Funcionamento geral</option>
                  <option value="access">Acesso ou autenticação</option>
                  <option value="data">Dados ou registos</option>
                  <option value="security">Segurança</option>
                  <option value="other">Outro problema</option>
                </select>
              </div>
              <div>
                <label htmlFor="status-report-screenshot" className="text-sm font-medium text-slate-200">Captura de ecrã <span className="font-normal text-slate-500">(opcional)</span></label>
                <input ref={screenshotInputRef} id="status-report-screenshot" type="file" accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp" onChange={handleScreenshotChange} className="mt-2 block w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-300 file:mr-3 file:rounded file:border-0 file:bg-emerald-500 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-slate-950 hover:file:bg-emerald-400" />
                <p className="mt-1 text-xs text-slate-500">PNG, JPEG ou WEBP até 5 MB. Evite incluir palavras-passe, dados pessoais ou informação financeira.</p>
                {reportScreenshot ? <p className="mt-2 flex items-center gap-2 text-xs text-emerald-200"><Paperclip aria-hidden="true" className="h-3.5 w-3.5" />{reportScreenshot.name} ({Math.ceil(reportScreenshot.size / 1024)} KB)</p> : null}
              </div>
              <div>
                <label htmlFor="status-report-description" className="text-sm font-medium text-slate-200">Descrição</label>
                <textarea id="status-report-description" value={reportDescription} onChange={(event) => setReportDescription(event.target.value)} maxLength={4000} required rows={4} placeholder="Explique o que aconteceu, em que página e a hora aproximada. Não inclua palavras-passe ou códigos." className="mt-2 w-full resize-y rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm leading-6 text-slate-100 outline-none placeholder:text-slate-500 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20" />
                <p className="mt-1 text-right text-xs text-slate-500">{reportDescription.length}/4000</p>
              </div>
              {reportResult ? <p role="status" aria-live="polite" className={`rounded-md px-3 py-2 text-sm ${reportResult.kind === "success" ? "bg-emerald-400/10 text-emerald-200" : "bg-rose-400/10 text-rose-200"}`}>{reportResult.message}</p> : null}
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button type="button" variant="ghost" className="text-slate-300 hover:bg-slate-800 hover:text-white" onClick={() => setReportOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={reporting || reportDescription.trim().length < 10} className="bg-emerald-500 text-slate-950 hover:bg-emerald-400"><Send className="mr-2 h-4 w-4" />{reporting ? "A enviar…" : "Enviar reporte"}</Button>
              </div>
            </form>
          ) : null}
        </div>

        <footer className="mt-8 border-t border-slate-800 pt-5 text-center text-xs leading-5 text-slate-500">
          A página consulta apenas o estado público do serviço. Não apresenta dados de membros, operações financeiras ou detalhes técnicos de segurança.
        </footer>
      </section>
    </main>
  );
}
