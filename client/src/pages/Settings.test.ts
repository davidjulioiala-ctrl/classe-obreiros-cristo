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
    expect(settingsSource).toContain("templateFormFontSizePoints");
    expect(settingsSource).toContain("template-header-font-size-points");
    expect(settingsSource).toContain("pdf-header-font-size-points");
    expect(settingsSource).toContain("normalizeHeaderFontSizePoints");
    expect(settingsSource).toContain("pdf-header-font-family");
    expect(settingsSource).toContain("pdf-header-text-color");
    expect(settingsSource).toContain("headerFontFamily");
    expect(settingsSource).toContain("headerTextColor");
  });

  it("expõe selectors visuais Office para fontes e cores nos modelos e no cabeçalho activo", () => {
    expect(settingsSource).toContain("function OfficeFontPicker");
    expect(settingsSource).toContain("function OfficeColorPicker");
    expect(settingsSource).toContain('role="radiogroup"');
    expect(settingsSource).toContain('role="radio"');
    expect(settingsSource).toContain("HEADER_FONT_FAMILIES");
    expect(settingsSource).toContain("HEADER_COLOR_PALETTE");
    expect(settingsSource).toContain("template-header-font-family");
    expect(settingsSource).toContain("template-header-text-color");
    expect(settingsSource).toContain("pdf-header-font-family");
    expect(settingsSource).toContain("pdf-header-text-color");
    expect(settingsSource).toContain("customInputLabel");
  });

  it("mantém formatação B/I/U e navegação directa para Notificações", () => {
    expect(settingsSource).toContain('const buttons: Array<{ tag: HeaderFormatTag; label: string; title: string }>');
    expect(settingsSource).toContain('tag: "b"');
    expect(settingsSource).toContain('tag: "i"');
    expect(settingsSource).toContain('tag: "u"');
    expect(settingsSource).toContain("parseHeaderText");
    expect(settingsSource).toContain('value="notifications"');
    expect(settingsSource).toContain("handleSaveNotifications");
    expect(settingsSource).toContain("requestedTab === \"notifications\"");
    expect(settingsSource).toContain("notifExternalOwnerAlerts");
    expect(settingsSource).toContain("externalOwnerAlerts");
    expect(settingsSource).toContain("Desativado por defeito");
  });
});
