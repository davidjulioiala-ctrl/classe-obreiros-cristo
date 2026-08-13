import { beforeEach, describe, expect, it, vi } from "vitest";

const { createUserMock, getUserCountMock } = vi.hoisted(() => ({
  createUserMock: vi.fn(),
  getUserCountMock: vi.fn(),
}));

vi.mock("./auth", async () => {
  const actual = await vi.importActual<typeof import("./auth")>("./auth");
  return { ...actual, createUser: createUserMock, getUserCount: getUserCountMock };
});

vi.mock("./_core/security", () => ({
  requireSameOrigin: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

import { registerAdminBootstrapRoute } from "./adminBootstrap";

describe("bootstrap do primeiro administrador", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("aceita o token secreto configurado e cria exactamente um administrador inicial", async () => {
    getUserCountMock.mockResolvedValue(0);
    createUserMock.mockResolvedValue({ id: 1, username: "primeiro-admin", role: "admin" });
    const routes: Array<{ method: string; path: string; handlers: Array<(req: any, res: any, next?: any) => void> }> = [];
    registerAdminBootstrapRoute({
      get: (path: string, ...handlers: Array<(req: any, res: any, next?: any) => void>) => routes.push({ method: "get", path, handlers }),
      post: (path: string, ...handlers: Array<(req: any, res: any, next?: any) => void>) => routes.push({ method: "post", path, handlers }),
    } as any);

    const route = routes.find((entry) => entry.method === "post" && entry.path === "/api/auth/bootstrap");
    expect(route).toBeDefined();
    const handler = route!.handlers.at(-1)!;
    const response = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    await handler({
      headers: { "x-initial-admin-token": process.env.INITIAL_ADMIN_BOOTSTRAP_TOKEN },
      body: { username: "primeiro-admin", password: "uma-senha-longa-e-segura", name: "Administrador inicial", email: "admin@example.test" },
    }, response);

    expect(createUserMock).toHaveBeenCalledWith("primeiro-admin", "uma-senha-longa-e-segura", "Administrador inicial", "admin@example.test", "membro", "admin");
    expect(response.status).toHaveBeenCalledWith(201);
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, user: expect.objectContaining({ role: "admin" }) }));
  });

  it("recusa o bootstrap quando já existe qualquer utilizador", async () => {
    getUserCountMock.mockResolvedValue(1);
    const routes: Array<{ method: string; path: string; handlers: Array<(req: any, res: any, next?: any) => void> }> = [];
    registerAdminBootstrapRoute({
      get: (path: string, ...handlers: Array<(req: any, res: any, next?: any) => void>) => routes.push({ method: "get", path, handlers }),
      post: (path: string, ...handlers: Array<(req: any, res: any, next?: any) => void>) => routes.push({ method: "post", path, handlers }),
    } as any);
    const handler = routes.find((entry) => entry.method === "post")!.handlers.at(-1)!;
    const response = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    await handler({ headers: { "x-initial-admin-token": process.env.INITIAL_ADMIN_BOOTSTRAP_TOKEN }, body: {} }, response);
    expect(createUserMock).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(409);
  });
});
