import { describe, expect, it } from "vitest";
import { getVisibleMenuItems } from "./DashboardLayoutCustom";

describe("navegação principal", () => {
  it("mantém Configurações visível para um oficial autorizado", () => {
    const labels = getVisibleMenuItems({ role: "user", churchRole: "oficial" }).map((item) => item.label);
    expect(labels).toContain("Configurações");
    expect(labels).not.toContain("Finanças");
    expect(labels).not.toContain("Transferências");
    expect(labels).not.toContain("Utilizadores");
  });

  it("mantém Configurações e Auditoria disponíveis para o administrador", () => {
    const labels = getVisibleMenuItems({ role: "admin", churchRole: "lider" }).map((item) => item.label);
    expect(labels).toContain("Configurações");
    expect(labels).toContain("Auditoria e backup");
  });
});
