import { describe, expect, it } from "vitest";
import { getSessionCookieOptions } from "./cookies";

function request(protocol: string, forwardedProto?: string) {
  return {
    protocol,
    headers: forwardedProto ? { "x-forwarded-proto": forwardedProto } : {},
  } as any;
}

describe("opções do cookie de sessão local", () => {
  it("permite a sessão no preview HTTPS embutido sem perder a protecção CSRF", () => {
    expect(getSessionCookieOptions(request("http", "https"))).toMatchObject({
      httpOnly: true,
      path: "/",
      secure: true,
      sameSite: "none",
    });
  });

  it("usa SameSite Lax em desenvolvimento HTTP sem Secure inválido", () => {
    expect(getSessionCookieOptions(request("http"))).toMatchObject({
      httpOnly: true,
      path: "/",
      secure: false,
      sameSite: "lax",
    });
  });

  it("reconhece um pedido HTTPS directo", () => {
    expect(getSessionCookieOptions(request("https"))).toMatchObject({
      secure: true,
      sameSite: "none",
    });
  });
});
