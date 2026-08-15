import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const componentSource = readFileSync(fileURLToPath(new URL("./TwoFactorSettings.tsx", import.meta.url)), "utf8");

describe("segurança 2FA por utilizador", () => {
  it("usa os endpoints da própria sessão e apresenta QR Code, segredo e recuperação", () => {
    expect(componentSource).toContain('"/api/auth/2fa/setup"');
    expect(componentSource).toContain('"/api/auth/2fa/confirm"');
    expect(componentSource).not.toContain('"/api/auth/2fa/disable"');
    expect(componentSource).toContain("qrGenerator.toDataURL");
    expect(componentSource).toContain("recoveryCodes");
    expect(componentSource).toContain("A configuração é obrigatória");
  });

  it("normaliza códigos colados, actualiza a sessão após confirmar e não exige papel administrativo", () => {
    expect(componentSource).toContain("function normalizeCode");
    expect(componentSource).toContain("await refresh();");
    expect(componentSource).not.toContain('user?.role === "admin"');
    expect(componentSource).not.toContain("Apenas administradores");
    expect(componentSource).not.toContain("Desactivar 2FA");
  });
});
