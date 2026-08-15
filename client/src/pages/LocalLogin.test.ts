import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const source = readFileSync(fileURLToPath(new URL("./LocalLogin.tsx", import.meta.url)), "utf8");

describe("login local", () => {
  it("muda para a segunda etapa quando o servidor exige 2FA", () => {
    expect(source).toContain("if (result.twoFactorRequired)");
    expect(source).toContain("setTwoFactorCode(\"\")");
    expect(source).toContain("setRequiresTwoFactor(true)");
  });

  it("aceita códigos de recuperação no campo 2FA, incluindo em telemóveis", () => {
    expect(source).toContain('inputMode="text"');
    expect(source).toContain('autoCapitalize="characters"');
    expect(source).toContain('placeholder="Código 2FA ou recuperação"');
    expect(source).toContain("Voltar ao login");
  });
});
