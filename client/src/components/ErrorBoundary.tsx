import { AlertTriangle, RefreshCw, RotateCcw } from "lucide-react";
import React, { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
}

const createErrorId = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `ERR-${timestamp}-${random}`;
};

export function buildClientErrorReport(errorId: string, error: Error, pagePath: string) {
  const safeName = String(error.name || "Error").replace(/[^a-zA-Z0-9 _-]/g, "").slice(0, 80) || "Error";
  const safePath = String(pagePath || "/").replace(/[^a-zA-Z0-9/_?=&.-]/g, "").slice(0, 300) || "/";
  return {
    category: "operational" as const,
    // Não transmitir a mensagem ou a stack, pois podem conter dados pessoais
    // ou detalhes internos. A referência permite ao administrador correlacionar
    // o relato do utilizador com o momento e a página afectada.
    description: `Erro de renderização no navegador. Referência: ${errorId}. Página: ${safePath}. Tipo: ${safeName}.`,
  };
}

/**
 * Captura erros de renderização na árvore React e mantém a aplicação num
 * estado recuperável, sem apresentar stack traces ou detalhes internos.
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorId: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorId: null,
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const errorId = createErrorId();

    // Registo técnico local, sem enviar dados para serviços externos e sem
    // mostrar a mensagem/stack ao utilizador final.
    console.error("[GlobalErrorBoundary] Renderização interrompida", {
      errorId,
      name: error.name,
      componentStack: info.componentStack,
    });

    if (typeof window !== "undefined") {
      const report = buildClientErrorReport(errorId, error, window.location.pathname);
      void fetch("/api/status-report", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(report),
      }).catch(() => {
        // O fallback permanece utilizável mesmo se o reporte técnico falhar.
      });
    }

    this.setState({ errorId });
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorId: null,
    });
  };

  private handleReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main
        role="alert"
        aria-live="assertive"
        className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-slate-100"
      >
        <section className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center shadow-2xl sm:p-8">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/15 text-amber-300">
            <AlertTriangle aria-hidden="true" size={30} />
          </div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300">
            Sistema de Gestão
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Ocorreu um erro inesperado
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Esta operação não pôde ser concluída. Os seus dados guardados não foram apagados. Tente novamente; se o problema continuar, recarregue a aplicação e informe o código de referência ao administrador.
          </p>
          {this.state.errorId ? (
            <p className="mt-4 rounded-lg bg-slate-950/70 px-3 py-2 font-mono text-xs text-slate-400">
              Referência: {this.state.errorId}
            </p>
          ) : null}
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={this.handleRetry}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2 focus:ring-offset-slate-900 active:scale-[0.98]"
            >
              <RotateCcw aria-hidden="true" size={16} />
              Tentar novamente
            </button>
            <button
              type="button"
              onClick={this.handleReload}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-900 active:scale-[0.98]"
            >
              <RefreshCw aria-hidden="true" size={16} />
              Recarregar aplicação
            </button>
          </div>
        </section>
      </main>
    );
  }
}

export default ErrorBoundary;
