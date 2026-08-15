import { beforeEach, describe, expect, it, vi } from "vitest";
import { maintenanceGate } from "./_core/maintenance";

const { getSystemMaintenanceStateMock, getLocalUserFromRequestMock } = vi.hoisted(() => ({
  getSystemMaintenanceStateMock: vi.fn(),
  getLocalUserFromRequestMock: vi.fn(),
}));

vi.mock("./db", () => ({
  getSystemMaintenanceState: getSystemMaintenanceStateMock,
}));

vi.mock("./_core/localAuthMiddleware", () => ({
  getLocalUserFromRequest: getLocalUserFromRequestMock,
}));

function request(originalUrl: string, method = "POST") {
  return { originalUrl, method } as any;
}

function response() {
  return { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
}

describe("gate de manutenção de emergência", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getLocalUserFromRequestMock.mockResolvedValue(null);
    getSystemMaintenanceStateMock.mockResolvedValue({
      enabled: true,
      reason: "Investigação de segurança",
      customMessage: "Estamos a aplicar uma actualização de segurança.",
      estimatedCompletionAt: "2026-08-15T18:30:00.000Z",
      incidentId: 12,
      startedAt: new Date().toISOString(),
      updatedBy: 1,
    });
  });

  it("bloqueia operações tRPC durante a manutenção", async () => {
    const res = response();
    const next = vi.fn();
    await maintenanceGate(request("/api/trpc/members.create"), res, next);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ maintenance: true, incidentId: 12 }));
    expect(next).not.toHaveBeenCalled();
  });

  it("devolve a mensagem personalizada e a conclusão estimada no bloqueio", async () => {
    const res = response();
    const next = vi.fn();
    await maintenanceGate(request("/api/trpc/members.create"), res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      maintenance: true,
      reason: "Investigação de segurança",
      customMessage: "Estamos a aplicar uma actualização de segurança.",
      estimatedCompletionAt: "2026-08-15T18:30:00.000Z",
      incidentId: 12,
    }));
  });

  it("permite que um administrador autenticado mantenha acesso à consola durante a manutenção", async () => {
    getLocalUserFromRequestMock.mockResolvedValue({ id: 1, role: "admin" });
    const res = response();
    const next = vi.fn();
    await maintenanceGate(request("/api/trpc/members.list", "GET"), res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("bloqueia escritas críticas mesmo para o administrador durante a manutenção", async () => {
    getLocalUserFromRequestMock.mockResolvedValue({ id: 1, role: "admin" });
    const res = response();
    const next = vi.fn();
    await maintenanceGate(request("/api/trpc/members.create"), res, next);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(next).not.toHaveBeenCalled();
  });

  it("mantém login e consola de emergência disponíveis", async () => {
    const loginRes = response();
    const loginNext = vi.fn();
    await maintenanceGate(request("/api/auth/login"), loginRes, loginNext);
    expect(loginNext).toHaveBeenCalledOnce();

    const incidentRes = response();
    const incidentNext = vi.fn();
    await maintenanceGate(request("/api/trpc/incident.diagnose"), incidentRes, incidentNext);
    expect(incidentNext).toHaveBeenCalledOnce();
  });

  it("falha fechada quando não consegue ler o estado para uma escrita", async () => {
    getSystemMaintenanceStateMock.mockRejectedValueOnce(new Error("db indisponível"));
    const res = response();
    const next = vi.fn();
    await maintenanceGate(request("/api/trpc/members.update"), res, next);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(next).not.toHaveBeenCalled();
  });
});
