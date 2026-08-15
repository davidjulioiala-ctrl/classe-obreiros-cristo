import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const maintenanceGateSource = readFileSync(fileURLToPath(new URL("./MaintenanceGate.tsx", import.meta.url)), "utf8");

describe("regresso ao login durante a manutenção", () => {
  it("termina a sessão antes de navegar para a tela de login", () => {
    expect(maintenanceGateSource).toContain('const { logout } = useLocalAuth();');
    expect(maintenanceGateSource).toContain('await logout();');
    expect(maintenanceGateSource).toContain('navigate("/login");');
    expect(maintenanceGateSource).toContain('"Voltar ao login"');
  });

  it("evita cliques repetidos enquanto a sessão está a ser terminada", () => {
    expect(maintenanceGateSource).toContain("returningToLogin");
    expect(maintenanceGateSource).toContain("disabled={returningToLogin}");
    expect(maintenanceGateSource).toContain("A terminar sessão…");
  });
});
