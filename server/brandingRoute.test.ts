import { describe, expect, it } from "vitest";
import { readPreviewBody } from "./brandingRoute";

describe("payload de pré-visualização do branding", () => {
  it("aceita apenas as opções de branding suportadas", () => {
    expect(readPreviewBody({ congregationName: "  Igreja Esperança  ", logoAlignment: "right", logoSize: "large", ignored: "valor" })).toEqual({
      congregationName: "  Igreja Esperança  ",
      logoAlignment: "right",
      logoSize: "large",
    });
  });

  it("remove valores inválidos e limita nomes longos", () => {
    const longName = "a".repeat(240);
    const result = readPreviewBody({ congregationName: longName, logoAlignment: "diagonal", logoSize: "huge" });
    expect(result.congregationName).toHaveLength(180);
    expect(result.logoAlignment).toBeUndefined();
    expect(result.logoSize).toBeUndefined();
  });
});
