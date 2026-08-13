import { beforeEach, describe, expect, it, vi } from "vitest";

const { createSecurityIncidentMock, storagePutMock } = vi.hoisted(() => ({
  createSecurityIncidentMock: vi.fn(),
  storagePutMock: vi.fn(),
}));

vi.mock("./db", () => ({
  createSecurityIncident: createSecurityIncidentMock,
}));

vi.mock("./storage", () => ({
  storagePut: storagePutMock,
}));

import { handleStatusReport, registerStatusReportRoute, resetStatusReportRateLimitForTests } from "./statusReportRoute";

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
  const handlers: unknown[] = [];
  const app = {
    post: vi.fn((_path: string, ...routeHandlers: unknown[]) => {
      handlers.push(...routeHandlers);
    }),
  };
  registerStatusReportRoute(app as never);
  expect(app.post).toHaveBeenCalledWith("/api/status-report", expect.any(Function), expect.any(Function));
  expect(handlers).toHaveLength(2);
  return handleStatusReport;
}

function makeRequest(overrides: Record<string, unknown> = {}) {
  return {
    body: { category: "security", description: "A página de login apresenta um erro inesperado." },
    ip: "198.51.100.12",
    socket: {},
    ...overrides,
  } as never;
}

describe("status report route", () => {
  beforeEach(() => {
    resetStatusReportRateLimitForTests();
    createSecurityIncidentMock.mockReset();
    storagePutMock.mockReset();
    createSecurityIncidentMock.mockResolvedValue({ id: 27, incidentCode: "INC-TEST-27" });
    storagePutMock.mockResolvedValue({ key: "status-reports/test.png", url: "https://storage.invalid/status-reports/test.png" });
  });

  it("regista um reporte público sanitizado e devolve uma referência", async () => {
    const handler = registerHandler();
    const response = makeResponse();

    await handler(makeRequest(), response);

    expect(response.statusCode).toBe(201);
    expect(response.body).toEqual({ success: true, reference: "INC-TEST-27" });
    expect(createSecurityIncidentMock).toHaveBeenCalledWith(expect.objectContaining({
      category: "reporte-publico:security",
      severity: "medium",
      source: "pagina-de-estado",
      createdBy: 0,
    }));
  });

  it("valida a assinatura da imagem e guarda apenas metadata do anexo", async () => {
    const screenshot = {
      buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01]),
      mimetype: "image/png",
      size: 9,
      originalname: "erro.png",
    };
    const response = makeResponse();

    await handleStatusReport(makeRequest({ ip: "198.51.100.20", file: screenshot }), response);

    expect(response.statusCode).toBe(201);
    expect(storagePutMock).toHaveBeenCalledWith(expect.stringMatching(/^status-reports\/\d{4}-\d{2}-\d{2}\/.+\.png$/), screenshot.buffer, "image/png");
    expect(createSecurityIncidentMock).toHaveBeenCalledWith(expect.objectContaining({
      attachmentKey: "status-reports/test.png",
      attachmentUrl: "https://storage.invalid/status-reports/test.png",
      attachmentMimeType: "image/png",
      attachmentSize: 9,
    }));
  });

  it("rejeita marcação e payload inválido sem criar incidente", async () => {
    const response = makeResponse();

    await handleStatusReport(makeRequest({ ip: "198.51.100.13", body: { category: "other", description: "<script>alert(1)</script>" } }), response);

    expect(response.statusCode).toBe(400);
    expect(createSecurityIncidentMock).not.toHaveBeenCalled();
  });

  it("rejeita ficheiros que não tenham assinatura de imagem válida", async () => {
    const response = makeResponse();

    await handleStatusReport(makeRequest({ ip: "198.51.100.21", file: { buffer: Buffer.from("not-an-image"), mimetype: "image/png", size: 12 } }), response);

    expect(response.statusCode).toBe(400);
    expect(storagePutMock).not.toHaveBeenCalled();
    expect(createSecurityIncidentMock).not.toHaveBeenCalled();
  });

  it("limita reportes repetidos pela origem de rede", async () => {
    const request = makeRequest({ ip: "198.51.100.14", body: { category: "operational", description: "A lista demora muito tempo a carregar." } });

    for (let index = 0; index < 3; index += 1) {
      const response = makeResponse();
      await handleStatusReport(request, response);
      expect(response.statusCode).toBe(201);
    }

    const blocked = makeResponse();
    await handleStatusReport(request, blocked);
    expect(blocked.statusCode).toBe(429);
    expect(blocked.headers["Retry-After"]).toBeTruthy();
  });
});
