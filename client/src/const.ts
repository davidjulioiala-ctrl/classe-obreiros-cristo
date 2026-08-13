export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/**
 * Compatibilidade para componentes legados.
 *
 * A aplicação usa autenticação local exclusivamente. Qualquer chamada antiga
 * a `startLogin` deve levar ao formulário local e nunca iniciar OAuth, Google
 * ou outro provedor externo.
 */
export const startLogin = () => {
  if (typeof window === "undefined") return;
  if (window.location.pathname !== "/login") {
    window.history.pushState({}, "", "/login");
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
};
