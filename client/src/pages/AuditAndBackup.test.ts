import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const auditSource = readFileSync(fileURLToPath(new URL("./AuditAndBackup.tsx", import.meta.url)), "utf8");

describe("revogação global de sessões", () => {
  it("liga o botão ao handler executável da revogação", () => {
    expect(auditSource).toContain("revokeAllSessions.mutateAsync()");
    expect(auditSource).toContain("onClick={() => void handleRevokeSessions()}");
    expect(auditSource).not.toContain("onClick={() => void handleRevokeSessions}");
  });

  it("redirecciona para novo login depois da revogação", () => {
    expect(auditSource).toContain('window.location.href = "/login"');
    expect(auditSource).toContain("Todas as sessões foram revogadas");
  });
});
