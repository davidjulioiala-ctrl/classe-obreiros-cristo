import { useEffect } from "react";
import { useLocalAuth } from "./useLocalAuth";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

/**
 * Fonte única de autenticação da aplicação. Mantemos o nome useAuth para que
 * os componentes existentes continuem compatíveis, mas a sessão é local,
 * baseada em cookie HttpOnly validado pelo servidor.
 */
export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = "/" } = options ?? {};
  const auth = useLocalAuth();

  useEffect(() => {
    if (!redirectOnUnauthenticated || auth.loading || auth.user) return;
    if (typeof window !== "undefined" && window.location.pathname !== redirectPath) {
      window.location.assign(redirectPath);
    }
  }, [auth.loading, auth.user, redirectOnUnauthenticated, redirectPath]);

  return auth;
}
