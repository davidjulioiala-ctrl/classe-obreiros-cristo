import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const source = readFileSync(fileURLToPath(new URL("./_core/trpc.ts", import.meta.url)), "utf8");

describe("protected tRPC 2FA policy", () => {
  it("requires a configured second factor before protected operations", () => {
    expect(source).toContain("TWO_FACTOR_REQUIRED_FOR_ALL");
    expect(source).toContain("!ctx.user.twoFactorEnabled");
    expect(source).toContain("Conclua a configuração do 2FA antes de utilizar o sistema.");
  });
});
