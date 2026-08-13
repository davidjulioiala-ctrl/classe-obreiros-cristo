import { PassThrough } from "node:stream";
import { describe, expect, it, vi } from "vitest";
import { registerTransferPdfRoute } from "./transferPdf";

const getLocalUserFromRequest = vi.hoisted(() => vi.fn());
const getAllMembers = vi.hoisted(() => vi.fn());

vi.mock("./_core/localAuthMiddleware", () => ({ getLocalUserFromRequest }));
vi.mock("./db", () => ({ getAllMembers }));

describe("rota de PDF das transferências de adultos", () => {
  it("gera PDF horizontal para membros que já foram marcados como inativos", async () => {
    getLocalUserFromRequest.mockResolvedValue({ id: 1, username: "admin" });
    getAllMembers.mockResolvedValue([
      {
        id: 7,
        name: "Membro Transferido",
        birthDate: new Date("2000-01-15T00:00:00.000Z"),
        sex: "M",
        groupId: 2,
        phoneOrange: "900000000",
        phoneTelecel: null,
        isActive: false,
      },
    ]);

    let routeHandler: ((request: any, response: any) => Promise<void>) | undefined;
    const app = {
      get: vi.fn((_path: string, handler: (request: any, response: any) => Promise<void>) => {
        routeHandler = handler;
      }),
    } as any;
    registerTransferPdfRoute(app);

    expect(app.get).toHaveBeenCalledWith("/api/transfers/adult-pdf", expect.any(Function));
    expect(routeHandler).toBeDefined();

    const response = new PassThrough();
    const headers = new Map<string, string>();
    const chunks: Buffer[] = [];
    let jsonBody: unknown;
    response.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    const finished = new Promise<void>((resolve) => response.on("finish", () => resolve()));
    (response as any).statusCode = 200;
    (response as any).setHeader = (name: string, value: string) => headers.set(name, value);
    (response as any).status = (code: number) => {
      (response as any).statusCode = code;
      return response;
    };
    (response as any).json = (body: unknown) => {
      jsonBody = body;
      return response;
    };

    await routeHandler!({
      query: { ids: "7", reason: "Entrada na camada de jovens" },
    }, response);
    await finished;

    expect(getAllMembers).toHaveBeenCalledWith(false);
    expect((response as any).statusCode).toBe(200);
    expect(jsonBody).toBeUndefined();
    expect(headers.get("Content-Type")).toBe("application/pdf");
    expect(Buffer.concat(chunks).subarray(0, 4).toString()).toBe("%PDF");
  });
});
