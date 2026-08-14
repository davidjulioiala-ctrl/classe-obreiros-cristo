import { describe, expect, it } from "vitest";
import { HEADER_COLOR_PALETTE, HEADER_FONT_FAMILIES, getHeaderFontCssFamily, normalizeHeaderFontFamily, normalizeHeaderPdfFontFamily, normalizeHeaderFontSizePoints, parseHeaderText } from "./headerFormatting";

describe("headerFormatting", () => {
  it("preserva quebras de linha", () => {
    const lines = parseHeaderText("Primeira linha\nSegunda linha");
    expect(lines).toHaveLength(2);
    expect(lines[0]?.[0]?.text).toBe("Primeira linha");
    expect(lines[1]?.[0]?.text).toBe("Segunda linha");
  });

  it("interpreta negrito, itálico e sublinhado", () => {
    const line = parseHeaderText("[b]Negrito[/b] [i]Itálico[/i] [u]Sublinhado[/u]")[0] ?? [];
    expect(line).toEqual([
      { text: "Negrito", bold: true, italic: false, underline: false },
      { text: " ", bold: false, italic: false, underline: false },
      { text: "Itálico", bold: false, italic: true, underline: false },
      { text: " ", bold: false, italic: false, underline: false },
      { text: "Sublinhado", bold: false, italic: false, underline: true },
    ]);
  });

  it("mantém marcações desconhecidas como texto simples", () => {
    expect(parseHeaderText("[x]texto[/x]")[0]?.[0]?.text).toBe("[x]texto[/x]");
  });

  it("aceita valores decimais com ponto e conserva uma casa decimal", () => {
    expect(normalizeHeaderFontSizePoints("12.5")).toBe(12.5);
    expect(normalizeHeaderFontSizePoints("12.56")).toBe(12.6);
  });

  it("aceita valores decimais com vírgula quando vêm de um campo local", () => {
    expect(normalizeHeaderFontSizePoints("12,5")).toBe(12.5);
  });

  it("mantém o fallback para texto vazio e limita valores fora do intervalo", () => {
    expect(normalizeHeaderFontSizePoints("", 16.5)).toBe(16.5);
    expect(normalizeHeaderFontSizePoints("4.5")).toBe(8);
    expect(normalizeHeaderFontSizePoints("80.5")).toBe(72);
  });

  it("expõe famílias Office e mapeia-as para fontes PDFKit seguras", () => {
    expect(HEADER_FONT_FAMILIES.map((font) => font.value)).toContain("Aptos");
    expect(HEADER_FONT_FAMILIES.map((font) => font.value)).toContain("Calibri");
    expect(normalizeHeaderFontFamily("Aptos Display")).toBe("Aptos Display");
    expect(normalizeHeaderPdfFontFamily("Aptos Display")).toBe("Helvetica");
    expect(normalizeHeaderPdfFontFamily("Aptos Serif")).toBe("Times-Roman");
    expect(normalizeHeaderPdfFontFamily("Aptos Mono")).toBe("Courier");
    expect(getHeaderFontCssFamily("Aptos Display")).toContain("Aptos Display");
    expect(normalizeHeaderFontFamily("fonte-inválida")).toBe("Helvetica");
  });

  it("disponibiliza a paleta de tema Office e permite cores personalizadas", () => {
    expect(HEADER_COLOR_PALETTE.find((color) => color.value === "#4472C4")?.label).toContain("Ênfase 1");
    expect(HEADER_COLOR_PALETTE.find((color) => color.value === "#70AD47")?.group).toBe("Office theme");
    expect(HEADER_COLOR_PALETTE.length).toBeGreaterThanOrEqual(20);
  });
});
