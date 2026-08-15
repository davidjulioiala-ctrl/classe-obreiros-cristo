import { describe, expect, it } from "vitest";
import { getSystemStatusView } from "./SystemStatus";

describe("estado público do sistema", () => {
  it("apresenta o estado operacional quando não há manutenção", () => {
    const view = getSystemStatusView({ enabled: false }, false, false);

    expect(view.tone).toBe("operational");
    expect(view.label).toBe("Operacional");
    expect(view.title).toContain("operacional");
  });

  it("apresenta a manutenção activa sem expor dados internos", () => {
    const view = getSystemStatusView(
      { enabled: true, reason: "Actualização programada", incidentId: 12 },
      false,
      false,
    );

    expect(view.tone).toBe("maintenance");
    expect(view.label).toBe("Manutenção activa");
    expect(view.description).not.toContain("password");
    expect(view.description).not.toContain("stack");
  });

  it("apresenta um estado neutro quando a API não responde", () => {
    const view = getSystemStatusView(null, true, false);

    expect(view.tone).toBe("unknown");
    expect(view.label).toBe("Estado indisponível");
    expect(view.description).toContain("Tente novamente");
  });
});


  it("formata uma conclusão estimada válida para o locale português", async () => {
    const { formatEstimatedCompletion } = await import("./SystemStatus");
    const formatted = formatEstimatedCompletion("2026-08-15T18:30:00.000Z");

    expect(formatted).toBeTruthy();
    expect(formatted).toContain("2026");
  });

  it("ignora uma conclusão estimada inválida sem quebrar a página", async () => {
    const { formatEstimatedCompletion } = await import("./SystemStatus");

    expect(formatEstimatedCompletion("data-inválida")).toBeNull();
    expect(formatEstimatedCompletion(null)).toBeNull();
  });
