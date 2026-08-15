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

  it("executa os handlers de incidente e eliminação em lote", () => {
    expect(auditSource).toContain("onClick={() => void handleCreateIncident()}");
    expect(auditSource).toContain("onClick={() => void removeManyLogs()}");
    expect(auditSource).not.toContain("onClick={() => void handleCreateIncident}");
    expect(auditSource).not.toContain("onClick={() => void removeManyLogs}");
  });

  it("actualiza automaticamente as consultas depois de restaurar um backup", () => {
    expect(auditSource).toContain("await utils.invalidate()");
    expect(auditSource).toContain("Os dados visíveis foram actualizados automaticamente.");
    expect(auditSource).not.toContain("Actualize a página para carregar os dados recuperados.");
  });
});
