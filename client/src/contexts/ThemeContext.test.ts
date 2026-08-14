import { describe, expect, it } from "vitest";
import { ACCENT_PALETTES, isAccentColor } from "./ThemeContext";

describe("paletas de aparência", () => {
  it("expõe todas as paletas suportadas com variáveis de marca e gráficos", () => {
    for (const accent of ["emerald", "blue", "purple", "pink"] as const) {
      expect(ACCENT_PALETTES[accent].primary).toMatch(/^#/);
      expect(ACCENT_PALETTES[accent].ring).toMatch(/^#/);
      expect(ACCENT_PALETTES[accent].chart).toHaveLength(5);
    }
  });

  it("rejeita valores de paleta desconhecidos", () => {
    expect(isAccentColor("emerald")).toBe(true);
    expect(isAccentColor("purple")).toBe(true);
    expect(isAccentColor("orange")).toBe(false);
    expect(isAccentColor(null)).toBe(false);
  });
});
