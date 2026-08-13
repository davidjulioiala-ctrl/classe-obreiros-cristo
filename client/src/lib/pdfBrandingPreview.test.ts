import { describe, expect, it } from "vitest";
import { getPdfPreviewLogoSize, getPdfPreviewName } from "./pdfBrandingPreview";

describe("pré-visualização do branding PDF", () => {
  it("mantém os tamanhos visualmente distintos", () => {
    expect(getPdfPreviewLogoSize("small")).toBe(48);
    expect(getPdfPreviewLogoSize("medium")).toBe(72);
    expect(getPdfPreviewLogoSize("large")).toBe(96);
  });

  it("usa um texto acessível quando o nome está vazio", () => {
    expect(getPdfPreviewName("   ")).toBe("Nome da congregação");
    expect(getPdfPreviewName(" Igreja Esperança ")).toBe("Igreja Esperança");
  });
});
