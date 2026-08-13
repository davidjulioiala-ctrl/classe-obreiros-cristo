import { describe, expect, it } from "vitest";
import {
  createLocalSessionToken,
  getSessionIdleSeconds,
  refreshLocalSessionToken,
  verifyLocalSessionToken,
  LOCAL_SESSION_IDLE_TIMEOUT_SECONDS,
  LOCAL_SESSION_TTL_SECONDS,
} from "./_core/localSession";

describe("sessões locais com limite de inactividade", () => {
  const now = Date.UTC(2026, 7, 13, 12, 0, 0);

  it("mantém a sessão válida antes dos 20 minutos", () => {
    const token = createLocalSessionToken(1, 1, now);
    const session = verifyLocalSessionToken(token, now + (LOCAL_SESSION_IDLE_TIMEOUT_SECONDS - 1) * 1000);

    expect(session?.userId).toBe(1);
    expect(getSessionIdleSeconds(session!, now + 60 * 1000)).toBe(60);
  });

  it("rejeita a sessão ao atingir 20 minutos sem actividade", () => {
    const token = createLocalSessionToken(1, 1, now);

    expect(verifyLocalSessionToken(token, now + LOCAL_SESSION_IDLE_TIMEOUT_SECONDS * 1000)).toBeNull();
  });

  it("renova a última actividade sem prolongar a validade absoluta", () => {
    const token = createLocalSessionToken(1, 1, now);
    const session = verifyLocalSessionToken(token, now + 10 * 60 * 1000);
    expect(session).not.toBeNull();

    const refreshed = refreshLocalSessionToken(session!, now + 10 * 60 * 1000);
    const afterRefresh = verifyLocalSessionToken(refreshed, now + 29 * 60 * 1000);
    expect(afterRefresh?.lastActivityAt).toBe(Math.floor((now + 10 * 60 * 1000) / 1000));
    expect(afterRefresh?.expiresAt).toBe(Math.floor(now / 1000) + LOCAL_SESSION_TTL_SECONDS);

    expect(verifyLocalSessionToken(refreshed, now + 31 * 60 * 1000)).toBeNull();
  });

  it("rejeita tokens adulterados", () => {
    const token = createLocalSessionToken(1, 1, now);
    expect(verifyLocalSessionToken(`${token}x`, now + 1_000)).toBeNull();
  });
});
