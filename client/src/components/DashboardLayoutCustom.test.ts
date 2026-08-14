import { describe, expect, it } from "vitest";
import { getVisibleMenuItems, menuItems } from "./DashboardLayoutCustom";

describe("navegação principal", () => {
  it("oculta Configurações e Louvor para um perfil de oficial", () => {
    const labels = getVisibleMenuItems({ role: "user", churchRole: "oficial" }).map((item) => item.label);
    expect(labels).not.toContain("Configurações");
    expect(labels).not.toContain("Louvor");
    expect(labels).not.toContain("Finanças");
    expect(labels).not.toContain("Transferências");
    expect(labels).not.toContain("Utilizadores");
  });

  it("mantém Configurações e Auditoria disponíveis para o administrador", () => {
    const labels = getVisibleMenuItems({ role: "admin", churchRole: "lider" }).map((item) => item.label);
    expect(labels).toContain("Configurações");
    expect(labels).toContain("Auditoria e backup");
  });

  it("mantém destinos únicos e válidos para todos os módulos do menu", () => {
    const hrefs = menuItems.map((item) => item.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(hrefs).toEqual(expect.arrayContaining([
      "/dashboard", "/members", "/members/incomplete", "/attendance", "/activities",
      "/finances", "/transfers", "/history", "/reports", "/materials", "/louvor",
      "/settings", "/users", "/audit-backup",
    ]));
    expect(hrefs.every((href) => href.startsWith("/"))).toBe(true);
  });

  it("mantém o módulo de Louvor limitado ao seu conjunto autorizado", () => {
    const labels = getVisibleMenuItems({ role: "user", churchRole: "louvor" }).map((item) => item.label);
    expect(labels).toEqual(["Página Inicial", "Membros", "Louvor"]);
  });
});
