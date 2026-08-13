import { beforeEach, describe, expect, it, vi } from "vitest";

const { createSecurityIncidentMock } = vi.hoisted(() => ({
  createSecurityIncidentMock: vi.fn(),
}));

vi.mock("./db", () => ({
  createSecurityIncident: createSecurityIncidentMock,
}));

import { registerStatusReportRoute, resetStatusReportRateLimitForTests } from "./statusReportRoute";

type TestResponse = {
  statusCode: number;
  headers: Record<string, string>;
  body?: unknown;
  status: (code: number) => TestResponse;
  setHeader: (name: string, value: string) => TestResponse;
  json: (payload: unknown) => TestResponse;
};

function makeResponse(): TestResponse {
  const response = {
    statusCode: 200,
    headers: {},
    status(code: number) {
      response.statusCode = code;
      return response;
    },
    setHeader(name: string, value: string) {
      response.headers[name] = value;
      return response;
    },
    json(payload: unknown) {
      response.body = payload;
      return response;
    },
  } satisfies TestResponse;
  return response;
}

function registerHandler() {
  let handler: ((req: any, res: TestResponse) => Promise<unknown>) | undefined;
  const app = {
    post: vi.fn((_path: string, _middleware: unknown, nextHandler: typeof handler) => {
      handler = nextHandler;
    }),
  };
  registerStatusReportRoute(app as never);
  expect(app.post).toHaveBeenCalledWith("/api/status-report", expect.any(Function), expect.any(Function));
  if (!handler) throw new Error("Endpoint não registado");
  return handler;
}

describe("status report route", () => {
  beforeEach(() => {
    resetStatusReportRateLimitForTests();
    createSecurityIncidentMock.mockReset();
    createSecurityIncidentMock.mockResolvedValue({ id: 27, incidentCode: "INC-TEST-27" });
  });

  it("regista um reporte público sanitizado e devolve uma referência", async () => {
    const handler = registerHandler();
    const response = makeResponse();

    await handler(
      { body: { category: "security", description: "A página de login apresenta um erro inesperado." }, ip: "198.51.100.12", socket: {} },
      response,
    );

    expect(response.statusCode).toBe(201);
    expect(response.body).toEqual({ success: true, reference: "INC-TEST-27" });
    expect(createSecurityIncidentMock).toHaveBeenCalledWith(expect.objectContaining({
      category: "reporte-publico:security",
      severity: "medium",
      source: "pagina-de-estado",
      createdBy: 0,
    }));
  });

  it("rejeita marcação e payload inválido sem criar incidente", async () => {
    const handler = registerHandler();
    const response = makeResponse();

    await handler({ body: { category: "other", description: "<script>alert(1)</script>" }, ip: "198.51.100.13", socket: {} }, response);

    expect(response.statusCode).toBe(400);
    expect(createSecurityIncidentMock).not.toHaveBeenCalled();
  });

  it("limita reportes repetidos pela origem de rede", async () => {
    const handler = registerHandler();
    const request = { body: { category: "operational", description: "A lista demora muito tempo a carregar." }, ip: "198.51.100.14", socket: {} };

    for (let index = 0; index < 3; index += 1) {
      const response = makeResponse();
      await handler(request, response);
      expect(response.statusCode).toBe(201);
    }

    const blocked = makeResponse();
    await handler(request, blocked);
    expect(blocked.statusCode).toBe(429);
    expect(blocked.headers["Retry-After"]).toBeTruthy();
  });
});
