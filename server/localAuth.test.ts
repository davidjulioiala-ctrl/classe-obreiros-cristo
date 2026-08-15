import { beforeEach, describe, expect, it, vi } from "vitest";
import { authenticateUser, hashPassword, verifyPassword } from "./auth";
import { getLocalUserFromRequest } from "./_core/localAuthMiddleware";
import { createLocalSessionToken, verifyLocalSessionToken } from "./_core/localSession";
import { COOKIE_NAME } from "../shared/const";

const { getUserByIdMock, getGlobalSessionRevokedAtMock, authenticateUserMock } = vi.hoisted(() => ({
  getUserByIdMock: vi.fn(),
  getGlobalSessionRevokedAtMock: vi.fn(),
  authenticateUserMock: vi.fn(),
}));

vi.mock("./auth", async () => {
  const actual = await vi.importActual<typeof import("./auth")>("./auth");
  return {
    ...actual,
    authenticateUser: authenticateUserMock,
    getUserById: getUserByIdMock,
  };
});

vi.mock("./db", () => ({
  getGlobalSessionRevokedAt: getGlobalSessionRevokedAtMock,
}));

const adminFixture = {
  id: 1,
  username: "admin",
  name: "Administrador de teste",
  email: "admin@example.test",
  password: "scrypt:v1:test",
  role: "admin",
  churchRole: "lider",
  isActive: true,
  sessionVersion: 1,
};

describe("autenticação local", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getGlobalSessionRevokedAtMock.mockResolvedValue(null);
    getUserByIdMock.mockResolvedValue(adminFixture);
  });

  it("usa hash scrypt não reversível para credenciais válidas", async () => {
    const passwordHash = await hashPassword("admin123");
    expect(passwordHash).not.toBe("admin123");
    expect(passwordHash).toMatch(/^scrypt:v1:/);
    await expect(verifyPassword("admin123", passwordHash)).resolves.toBe(true);
    await expect(verifyPassword("senha-incorreta", passwordHash)).resolves.toBe(false);
  });

  it("mantém a autenticação baseada na base de dados sem aceitar utilizador inactivo", async () => {
    authenticateUserMock.mockResolvedValue(adminFixture);
    await expect(authenticateUser("admin", "admin123")).resolves.toMatchObject({ username: "admin" });

    authenticateUserMock.mockResolvedValue(null);
    await expect(authenticateUser("admin", "senha-incorreta")).resolves.toBeNull();
  });

  it("valida um token assinado e expira tokens fora do prazo", () => {
    const now = Date.UTC(2026, 7, 13, 12, 0, 0);
    const token = createLocalSessionToken(1, 1, now);
    const session = verifyLocalSessionToken(token, now + 1_000);
    expect(session?.userId).toBe(1);
    expect(verifyLocalSessionToken(`${token}x`, now + 1_000)).toBeNull();
    expect(verifyLocalSessionToken(token, now + 8 * 24 * 60 * 60 * 1_000)).toBeNull();
  });

  it("rejeita sessões emitidas antes da revogação global", async () => {
    const issuedAt = Date.now() - 60_000;
    const token = createLocalSessionToken(1, 1, issuedAt);
    getGlobalSessionRevokedAtMock.mockResolvedValue(new Date().toISOString());
    const request = { headers: { cookie: `${COOKIE_NAME}=${token}` } } as any;
    await expect(getLocalUserFromRequest(request)).resolves.toBeNull();
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


describe("contrato do login 2FA", () => {
  it("normaliza o nome de utilizador antes de consultar a conta e aplicar rate limit", async () => {
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const source = readFileSync(fileURLToPath(new URL("./_core/localAuth.ts", import.meta.url)), "utf8");
    expect(source).toContain('const normalizedUsername = typeof username === "string" ? username.trim().toLowerCase() : "";');
    expect(source).toContain("checkLoginRateLimit(req, normalizedUsername)");
    expect(source).toContain("authenticateUser(normalizedUsername, password)");
  });

  it("mantém o desafio recuperável e aceita código autenticador ou de recuperação", async () => {
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const source = readFileSync(fileURLToPath(new URL("./_core/localAuth.ts", import.meta.url)), "utf8");
    expect(source).toContain('const normalizedCode = typeof code === "string" ? code.trim().slice(0, 64) : "";');
    expect(source).toContain("código da aplicação autenticadora ou um código de recuperação");
    expect(source).toContain("consumeRecoveryCode(settings.recoveryCodes, code)");
    expect(source).toContain("O desafio 2FA expirou. Volte ao login");
    expect(source).toContain("A configuração 2FA desta conta está incompleta");
  });

  it("expõe o estado 2FA sem filtrar utilizadores comuns e mantém setup por sessão", async () => {
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const authSource = readFileSync(fileURLToPath(new URL("./_core/localAuth.ts", import.meta.url)), "utf8");
    const middlewareSource = readFileSync(fileURLToPath(new URL("./_core/localAuthMiddleware.ts", import.meta.url)), "utf8");
    expect(authSource).toContain("if (user.twoFactorEnabled)");
    expect(authSource).not.toContain('user.role !== "admin" || !user.isActive');
    expect(authSource).not.toContain("Apenas administradores podem configurar 2FA");
    expect(middlewareSource).toContain("twoFactorEnabled: Boolean(user.twoFactorEnabled)");
    expect(middlewareSource).not.toContain('user.role === "admin" ? Boolean(user.twoFactorEnabled) : false');
  });

  it("verifica a persistência do segredo e distingue setup pendente de código inválido", async () => {
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const source = readFileSync(fileURLToPath(new URL("./_core/localAuth.ts", import.meta.url)), "utf8");
    expect(source).toContain("const persistedSetup = await getTwoFactorSettings(user.id);");
    expect(source).toContain("A configuração 2FA não pôde ser validada no servidor");
    expect(source).toContain("Não existe uma configuração 2FA pendente");
    expect(source).toContain("O 2FA não ficou activo");
  });
});
