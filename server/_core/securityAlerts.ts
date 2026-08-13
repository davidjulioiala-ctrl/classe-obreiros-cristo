import { notifyOwner } from "./notification";

const recentAlerts = new Map<string, number>();
const DEDUPE_WINDOW_MS = 60_000;
const SAFE_METADATA_KEYS = new Set(["ip", "formato", "inicio", "fim", "registos"]);

type SecurityAlert = {
  kind: "login_failure" | "two_factor_failure" | "sensitive_export";
  title: string;
  actorId?: number;
  resource?: string;
  metadata?: Record<string, string | number | boolean | undefined>;
};

function sanitizeValue(value: string | number | boolean | undefined) {
  if (value === undefined) return undefined;
  return String(value).replace(/[\r\n<>]/g, "").slice(0, 200);
}

export async function notifySecurityEvent(alert: SecurityAlert) {
  const stableKey = `${alert.kind}:${alert.actorId ?? "unknown"}:${alert.resource ?? "unknown"}:${sanitizeValue(alert.metadata?.ip) ?? "unknown"}`;
  const now = Date.now();
  const previous = recentAlerts.get(stableKey);
  if (previous && now - previous < DEDUPE_WINDOW_MS) return false;
  recentAlerts.set(stableKey, now);

  const metadata = Object.entries(alert.metadata ?? {})
    .filter(([key]) => SAFE_METADATA_KEYS.has(key))
    .map(([key, value]) => [key, sanitizeValue(value)] as const)
    .filter((entry): entry is readonly [string, string] => entry[1] !== undefined)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");
  const content = [
    "Foi detectado um evento de segurança no sistema Classe Obreiros de Cristo.",
    `Tipo: ${alert.kind}`,
    alert.actorId ? `Utilizador autenticado: #${alert.actorId}` : "Utilizador autenticado: não identificado",
    alert.resource ? `Recurso: ${sanitizeValue(alert.resource)}` : undefined,
    metadata || undefined,
    "Não responder a este alerta com palavras-passe, códigos 2FA ou outros segredos.",
  ].filter(Boolean).join("\n");

  try {
    return await notifyOwner({ title: alert.title, content });
  } catch (error) {
    console.warn("[SecurityAlert] Notification failed:", error);
    return false;
  }
}
