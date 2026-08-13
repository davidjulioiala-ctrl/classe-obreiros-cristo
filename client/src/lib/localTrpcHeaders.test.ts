import { describe, expect, it } from "vitest";
import { localTrpcHeaders } from "./localTrpcHeaders";

describe("localTrpcHeaders", () => {
  it("não envia Authorization nem lê o token Manus/OAuth do navegador", () => {
    Object.defineProperty(globalThis, "sessionStorage", {
      configurable: true,
      value: {
        getItem: () => "app_session_id=token-externo",
      },
    });

    expect(localTrpcHeaders()).toEqual({});
  });
});
