import { describe, expect, it } from "vitest";
import { readPreviewBody } from "./brandingRoute";

describe("payload de pré-visualização do branding", () => {
  it("aceita apenas as opções de branding suportadas", () => {
    expect(readPreviewBody({ congregationName: "  Igreja Esperança  ", logoAlignment: "right", logoSize: "large", headerTextAlignment: "left", headerFontSize: "large", headerFontFamily: "Times-Roman", headerTextColor: "#123456", ignored: "valor" })).toEqual({
      congregationName: "  Igreja Esperança  ",
      logoAlignment: "right",
      logoSize: "large",
      headerTextAlignment: "left",
      headerFontSize: "large",
      headerFontFamily: "Times-Roman",
      headerTextColor: "#123456",
    });
  });

  it("remove valores inválidos e limita nomes longos", () => {
    const longName = "a".repeat(240);
    const result = readPreviewBody({ congregationName: longName, logoAlignment: "diagonal", logoSize: "huge", headerTextAlignment: "diagonal", headerFontSize: "huge", headerFontFamily: "Comic Sans", headerTextColor: "red" });
    expect(result.congregationName).toHaveLength(180);
    expect(result.logoAlignment).toBeUndefined();
    expect(result.logoSize).toBeUndefined();
    expect(result.headerTextAlignment).toBeUndefined();
    expect(result.headerFontSize).toBeUndefined();
    expect(result.headerFontFamily).toBeUndefined();
    expect(result.headerTextColor).toBeUndefined();
  });
});
