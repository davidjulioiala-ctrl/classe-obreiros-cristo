export type DiagnosticAuditEntry = {
  id: number;
  userId: number;
  action: string;
  entityType: string | null;
  entityId: number | null;
  details: string | null;
  createdAt: Date | string;
};

export type IncidentDiagnosticInput = {
  maintenance: {
    enabled: boolean;
    reason: string;
    incidentId: number | null;
    startedAt: string | null;
    updatedBy: number | null;
  };
  globalSessionRevokedAt: string | null;
  incidents: Array<{
    id: number;
    incidentCode: string;
    category: string;
    severity: string;
    status: string;
    title: string;
    source: string | null;
    affectedRecords: string | null;
    detectedAt: Date | string;
    createdBy: number;
  }>;
  auditLogs: DiagnosticAuditEntry[];
};

const FAILURE_ACTION = /(falha|erro|bloque|inval|suspeit|ataque|deneg|viol)/i;
const CONTAINMENT_ACTION = /(revogar|manuten|bloque|desactiv|desativ|restaurar)/i;
const SENSITIVE_ACTION = /(exportar|descarregar|download|restaurar)/i;
const SAFE_DETAIL_KEYS = new Set(["ip", "origin", "source", "endpoint", "reason", "resource"]);

function safeText(value: unknown, maxLength = 240) {
  return String(value ?? "").replace(/[\r\n<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function parseSafeDetails(value: string | null) {
  if (!value) return {} as Record<string, string>;
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed)
        .filter(([key, item]) => SAFE_DETAIL_KEYS.has(key) && ["string", "number", "boolean"].includes(typeof item))
        .map(([key, item]) => [key, safeText(item)])
        .filter(([, item]) => item.length > 0),
    );
  } catch {
    return {} as Record<string, string>;
  }
}

function toIso(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date(0).toISOString() : date.toISOString();
}

export function buildIncidentDiagnosis(input: IncidentDiagnosticInput) {
  const orderedLogs = [...input.auditLogs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const suspiciousLogs = orderedLogs.filter((entry) => FAILURE_ACTION.test(entry.action) || FAILURE_ACTION.test(entry.details ?? ""));
  const containmentLogs = orderedLogs.filter((entry) => CONTAINMENT_ACTION.test(entry.action));
  const sensitiveLogs = orderedLogs.filter((entry) => SENSITIVE_ACTION.test(entry.action));

  const actorIds = Array.from(new Set(suspiciousLogs.map((entry) => entry.userId).filter((id) => Number.isInteger(id) && id > 0)));
  const affectedRecords = Array.from(new Set(
    suspiciousLogs
      .filter((entry) => entry.entityType && Number.isInteger(entry.entityId))
      .map((entry) => `${safeText(entry.entityType, 100)}#${entry.entityId}`),
  ));
  const sourceIndicators = Array.from(new Set(
    suspiciousLogs
      .flatMap((entry) => {
        const details = parseSafeDetails(entry.details);
        return [details.ip, details.origin, details.source].filter(Boolean) as string[];
      }),
  ));

  const recentEvents = [...suspiciousLogs, ...sensitiveLogs]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 50)
    .map((entry) => ({
      id: entry.id,
      userId: entry.userId,
      action: safeText(entry.action, 100),
      entityType: entry.entityType ? safeText(entry.entityType, 100) : null,
      entityId: entry.entityId,
      details: parseSafeDetails(entry.details),
      createdAt: toIso(entry.createdAt),
    }));

  const recommendations: string[] = [];
  if (suspiciousLogs.length > 0) recommendations.push("Rever os eventos suspeitos e confirmar os utilizadores e registos envolvidos.");
  if (sourceIndicators.length > 0) recommendations.push("Validar as origens técnicas identificadas nos registos e comparar com os acessos esperados.");
  if (!input.globalSessionRevokedAt && suspiciousLogs.length > 0) recommendations.push("Revogar todas as sessões se existir suspeita de credencial ou sessão comprometida.");
  if (!input.maintenance.enabled && suspiciousLogs.length > 0) recommendations.push("Activar a manutenção de emergência antes de alterar ou restaurar dados.");
  if (recommendations.length === 0) recommendations.push("Não foram detectados indicadores críticos nos registos analisados.");

  return {
    checkedAt: new Date().toISOString(),
    detectedProblems: {
      suspiciousEventCount: suspiciousLogs.length,
      containmentEventCount: containmentLogs.length,
      sensitiveExportCount: sensitiveLogs.length,
      openIncidentCount: input.incidents.filter((incident) => incident.status !== "resolved").length,
    },
    forensic: {
      actorIds,
      sourceIndicators,
      affectedRecords,
      recentEvents,
    },
    containment: {
      maintenance: input.maintenance,
      globalSessionRevokedAt: input.globalSessionRevokedAt,
      sessionsContainmentActive: Boolean(input.globalSessionRevokedAt),
    },
    recommendations,
  };
}
