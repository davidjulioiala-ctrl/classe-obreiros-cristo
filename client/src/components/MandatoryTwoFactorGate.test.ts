import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "../../..");
const source = readFileSync(resolve(projectRoot, "client/src/components/MandatoryTwoFactorGate.tsx"), "utf8");

describe("mandatory 2FA gate", () => {
  it("keeps the shared setup panel available and exposes only safe session exit", () => {
    expect(source).toContain("<TwoFactorSettings />");
    expect(source).toContain("O acesso às operações ficará disponível imediatamente após a confirmação.");
    expect(source).toContain("onClick={() => void logout()}");
    expect(source).not.toContain("DashboardLayout");
  });
});
