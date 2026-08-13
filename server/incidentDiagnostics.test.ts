import { describe, expect, it } from "vitest";
import { buildIncidentDiagnosis } from "./_core/incidentDiagnostics";

describe("diagnóstico de incidentes", () => {
  it("identifica falhas, actores, origens e registos sem devolver segredos", () => {
    const result = buildIncidentDiagnosis({
      maintenance: {
        enabled: false,
        reason: "",
        incidentId: null,
        startedAt: null,
        updatedBy: null,
      },
      globalSessionRevokedAt: null,
      incidents: [
        {
          id: 7,
          incidentCode: "INC-7",
          category: "acesso",
          severity: "high",
          status: "open",
          title: "Falha de acesso",
          source: "alerta",
          affectedRecords: "users#1",
          detectedAt: new Date("2026-08-13T10:00:00Z"),
          createdBy: 1,
        },
      ],
      auditLogs: [
        {
          id: 10,
          userId: 4,
          action: "falha_login",
          entityType: "users",
          entityId: 1,
          details: JSON.stringify({ ip: "127.0.0.1", password: "não incluir", code: "123456" }),
          createdAt: new Date("2026-08-13T10:01:00Z"),
        },
        {
          id: 11,
          userId: 4,
          action: "exportar",
          entityType: "backup_local",
          entityId: 2,
          details: JSON.stringify({ resource: "backup#2" }),
          createdAt: new Date("2026-08-13T10:02:00Z"),
        },
      ],
    });

    expect(result.detectedProblems.suspiciousEventCount).toBe(1);
    expect(result.detectedProblems.sensitiveExportCount).toBe(1);
    expect(result.forensic.actorIds).toEqual([4]);
    expect(result.forensic.sourceIndicators).toEqual(["127.0.0.1"]);
    expect(result.forensic.affectedRecords).toEqual(["users#1"]);
    expect(JSON.stringify(result)).not.toContain("123456");
    expect(JSON.stringify(result)).not.toContain("password");
    expect(result.recommendations.length).toBeGreaterThan(0);
  });
});
