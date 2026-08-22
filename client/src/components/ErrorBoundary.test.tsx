import { describe, expect, it } from "vitest";
import ErrorBoundary, { buildClientErrorReport } from "./ErrorBoundary";

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

  it("cria um reporte técnico correlacionável sem expor a mensagem interna do erro", () => {
    const report = buildClientErrorReport("ERR-TESTE-1", new Error("token=segredo <interno>"), "/members?nome=Ana");

    expect(report).toEqual({
      category: "operational",
      description: "Erro de renderização no navegador. Referência: ERR-TESTE-1. Página: /members?nome=Ana. Tipo: Error.",
    });
    expect(report.description).not.toContain("segredo");
  });
});
