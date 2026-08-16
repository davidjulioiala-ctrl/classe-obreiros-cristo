import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const componentSource = readFileSync(fileURLToPath(new URL("./TwoFactorSettings.tsx", import.meta.url)), "utf8");

describe("segurança 2FA por utilizador", () => {
  it("usa os endpoints da própria sessão e apresenta QR Code, segredo e recuperação", () => {
    expect(componentSource).toContain('"/api/auth/2fa/setup"');
    expect(componentSource).toContain('"/api/auth/2fa/confirm"');
    expect(componentSource).toContain('"/api/auth/2fa/disable"');
    expect(componentSource).toContain("qrGenerator.toDataURL");
    expect(componentSource).toContain("recoveryCodes");
    expect(componentSource).toContain("Proteja a sua conta");
  });

  it("normaliza códigos colados, preserva o setup durante a resposta e não exige papel administrativo", () => {
    expect(componentSource).toContain("function normalizeTotpCode");
    expect(componentSource).toContain("function normalizeRecoveryOrTotpCode");
    expect(componentSource).toContain("Código para desactivar");
    expect(componentSource).toContain("await refresh();");
    const setupStart = componentSource.slice(componentSource.indexOf("async function startSetup"), componentSource.indexOf("async function confirmSetup"));
    expect(setupStart).not.toContain("await refresh();");
    expect(componentSource).toContain("O middleware renova o cookie da sessão na própria chamada");
    expect(componentSource).not.toContain('user?.role === "admin"');
    expect(componentSource).not.toContain("Apenas administradores");
  });
});
