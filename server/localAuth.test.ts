import { describe, expect, it } from "vitest";
import { authenticateUser } from "./auth";
import { getLocalUserFromRequest } from "./_core/localAuthMiddleware";
import { createLocalSessionToken, verifyLocalSessionToken } from "./_core/localSession";
import { COOKIE_NAME } from "../shared/const";

describe("autenticação local", () => {
  it("aceita as credenciais administrativas existentes", async () => {
    const user = await authenticateUser("admin", "admin123");
    expect(user).not.toBeNull();
    expect(user?.username).toBe("admin");
    expect(user?.password).not.toBe("admin123");
  });

  it("rejeita uma palavra-passe inválida", async () => {
    const user = await authenticateUser("admin", "senha-incorreta");
    expect(user).toBeNull();
  });

  it("valida um token assinado e expira tokens fora do prazo", () => {
    const now = Date.UTC(2026, 7, 13, 12, 0, 0);
    const token = createLocalSessionToken(1, 1, now);
    const session = verifyLocalSessionToken(token, now + 1_000);
    expect(session?.userId).toBe(1);
    expect(verifyLocalSessionToken(`${token}x`, now + 1_000)).toBeNull();
    expect(verifyLocalSessionToken(token, now + 8 * 24 * 60 * 60 * 1_000)).toBeNull();
  });

  it("resolve o utilizador pela sessão assinada e rejeita cookie adulterado", async () => {
    const token = createLocalSessionToken(1, 1);
    const request = {
      headers: { cookie: `${COOKIE_NAME}=${token}` },
    } as any;
    const user = await getLocalUserFromRequest(request);
    expect(user?.username).toBe("admin");

    const invalidRequest = {
      headers: { cookie: `${COOKIE_NAME}=${token.slice(0, -1)}x` },
    } as any;
    await expect(getLocalUserFromRequest(invalidRequest)).resolves.toBeNull();
  });
});
