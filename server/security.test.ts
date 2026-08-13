import { describe, expect, it } from "vitest";
import {
  checkLoginRateLimit,
  recordLoginFailure,
  requireSameOrigin,
  safeText,
  securityHeaders,
} from "./_core/security";

function request(overrides: Record<string, unknown> = {}) {
  const headers = (overrides.headers ?? {}) as Record<string, string>;
  return {
    method: "POST",
    ip: "198.51.100.10",
    protocol: "https",
    socket: { remoteAddress: "198.51.100.10" },
    headers,
    get(name: string) {
      return headers[name.toLowerCase()] ?? headers[name];
    },
    ...overrides,
  } as any;
}

describe("endurecimento de segurança", () => {
  it("rejeita markup em texto livre", () => {
    expect(safeText(100).safeParse("Nome válido").success).toBe(true);
    expect(safeText(100).safeParse("<script>alert(1)</script>").success).toBe(false);
  });

  it("rejeita mutações cookie-based de origem diferente", () => {
    const req = request({ headers: { cookie: "session=x", origin: "https://evil.example" } });
    const res = { status: () => res, json: () => res } as any;
    const next = () => undefined;
    const result = requireSameOrigin(req, res, next);
    expect(result).toBe(res);
  });

  it("aceita mutações da mesma origem", () => {
    const req = request({ headers: { cookie: "session=x", origin: "https://app.example", host: "app.example" }, get: (name: string) => ({ host: "app.example", origin: "https://app.example" } as Record<string, string | undefined>)[name.toLowerCase()] });
    let called = false;
    const res = {} as any;
    requireSameOrigin(req, res, () => { called = true; });
    expect(called).toBe(true);
  });

  it("bloqueia tentativas repetidas por utilizador e endereço", () => {
    const username = `security-test-${Date.now()}`;
    const req = request();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect(checkLoginRateLimit(req, username).allowed).toBe(true);
      recordLoginFailure(req, username);
    }
    expect(checkLoginRateLimit(req, username).allowed).toBe(false);
  });

  it("emite cabeçalhos de segurança essenciais", () => {
    const values = new Map<string, string>();
    const res = {
      removeHeader: () => undefined,
      setHeader: (name: string, value: string) => values.set(name, value),
      getHeader: () => undefined,
    } as any;
    securityHeaders(request({ method: "GET" }), res, () => undefined);
    expect(values.get("X-Content-Type-Options")).toBe("nosniff");
    expect(values.get("X-Frame-Options")).toBe("DENY");
    expect(values.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
  });
});
