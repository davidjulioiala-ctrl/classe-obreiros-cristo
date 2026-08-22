import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import { localTrpcHeaders } from "./lib/localTrpcHeaders";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import "./index.css";

const queryClient = new QueryClient();

const isTwoFactorRequiredError = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return false;
  const message = error.message.toLocaleLowerCase("pt-PT");
  return message.includes("two_factor_required")
    || message.includes("autenticação de dois factores é obrigatória");
};

const redirectToLocalLoginIfUnauthorized = (error: unknown) => {
  if (isTwoFactorRequiredError(error)) {
    window.dispatchEvent(new Event("local-two-factor-required"));
    return;
  }
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;
  if (error.message !== UNAUTHED_ERR_MSG) return;

  // A autenticação da aplicação é local. Nunca iniciar Manus OAuth/Google
  // automaticamente a partir de uma falha de uma consulta protegida.
  if (window.location.pathname === "/" || window.location.pathname === "/login") return;
  window.history.replaceState({}, "", "/login");
  window.dispatchEvent(new PopStateEvent("popstate"));
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLocalLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLocalLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      // O sistema usa exclusivamente o cookie de sessão local.
      headers: localTrpcHeaders,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
    <ErrorBoundary>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </trpc.Provider>
    </ErrorBoundary>
);
