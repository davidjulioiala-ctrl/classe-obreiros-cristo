import { describe, expect, it } from "vitest";
import { parseHeaderText } from "./headerFormatting";

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
});
