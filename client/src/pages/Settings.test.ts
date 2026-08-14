import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const settingsSource = readFileSync(fileURLToPath(new URL("./Settings.tsx", import.meta.url)), "utf8");

describe("personalização de cabeçalhos", () => {
  it("cria e edita modelos de cabeçalho de forma persistente", () => {
    expect(settingsSource).toContain("handleCreateHeaderTemplate");
    expect(settingsSource).toContain("headerTemplates: nextTemplates");
    expect(settingsSource).toContain("handleSaveTemplateEditor");
    expect(settingsSource).toContain("+ Novo Modelo");
  });

  it("permite texto de cabeçalho em várias linhas", () => {
    expect(settingsSource).toContain("activeHeaderTitleRef");
    expect(settingsSource).toContain("Pressione Enter para iniciar uma nova linha.");
    expect(settingsSource).toContain("HeaderFormattingToolbar");
    expect(settingsSource).toContain("FormattedHeaderPreview");
    expect(settingsSource).toContain("pdf-header-text-alignment");
    expect(settingsSource).toContain("pdf-header-font-size");
    expect(settingsSource).toContain("templateFormTextAlignment");
    expect(settingsSource).toContain("templateFormFontSize");
    expect(settingsSource).toContain("pdf-header-font-family");
    expect(settingsSource).toContain("pdf-header-text-color");
    expect(settingsSource).toContain("headerFontFamily");
    expect(settingsSource).toContain("headerTextColor");
  });
});
