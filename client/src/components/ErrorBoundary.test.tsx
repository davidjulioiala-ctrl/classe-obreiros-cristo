import { describe, expect, it } from "vitest";
import ErrorBoundary from "./ErrorBoundary";

describe("ErrorBoundary global", () => {
  it("converte um erro de renderização num estado recuperável", () => {
    const error = new Error("falha interna de teste");
    const state = ErrorBoundary.getDerivedStateFromError(error);

    expect(state.hasError).toBe(true);
    expect(state.error).toBe(error);
    expect(state.errorId).toBeNull();
  });

  it("não expõe a mensagem interna no fallback e apresenta recuperação", () => {
    const boundary = new ErrorBoundary({ children: null });
    boundary.state = {
      hasError: true,
      error: new Error("detalhe sensível"),
      errorId: "ERR-TESTE",
    };

    const fallback = boundary.render();
    const output = JSON.stringify(fallback);

    expect(output).toContain("Ocorreu um erro inesperado");
    expect(output).toContain("Tentar novamente");
    expect(output).toContain("ERR-TESTE");
    expect(output).not.toContain("detalhe sensível");
  });
});
