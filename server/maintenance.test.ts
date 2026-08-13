import { beforeEach, describe, expect, it, vi } from "vitest";
import { maintenanceGate } from "./_core/maintenance";

const { getSystemMaintenanceStateMock } = vi.hoisted(() => ({
  getSystemMaintenanceStateMock: vi.fn(),
}));

vi.mock("./db", () => ({
  getSystemMaintenanceState: getSystemMaintenanceStateMock,
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
    getSystemMaintenanceStateMock.mockResolvedValue({
      enabled: true,
      reason: "Investigação de segurança",
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
