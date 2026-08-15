import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const source = readFileSync(fileURLToPath(new URL("./useLocalAuth.ts", import.meta.url)), "utf8");

describe("local auth mandatory 2FA transition", () => {
  it("accepts the server setup-required response and keeps the authenticated user", () => {
    expect(source).toContain("twoFactorSetupRequired?: boolean");
    expect(source).toContain("Boolean(data.twoFactorSetupRequired)");
    expect(source).toContain("setUser(data.user)");
    expect(source).toContain("Configure o 2FA para continuar.");
  });
});
