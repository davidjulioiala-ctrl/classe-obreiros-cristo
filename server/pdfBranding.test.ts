import { afterEach, describe, expect, it, vi } from "vitest";
import { drawPdfHeader, loadPdfBranding, pdfFooterText, DEFAULT_CONGREGATION_NAME } from "./pdfBranding";

const getAppSetting = vi.hoisted(() => vi.fn());
const storageGetSignedUrl = vi.hoisted(() => vi.fn());

vi.mock("./db", () => ({ getAppSetting }));
vi.mock("./storage", () => ({ storageGetSignedUrl }));

describe("branding dos PDFs", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    getAppSetting.mockReset();
    storageGetSignedUrl.mockReset();
  });

  it("usa o nome configurado e ignora logótipo ausente", async () => {
    getAppSetting.mockResolvedValue(JSON.stringify({ congregationName: "Congregação Esperança" }));

    const branding = await loadPdfBranding();

    expect(branding).toEqual({ congregationName: "Congregação Esperança", headerTitleText: "Congregação Esperança", logoBuffer: null, logoMimeType: null, logoAlignment: "center", logoSize: "medium", headerTextAlignment: "center", headerFontSize: "medium", headerFontSizePoints: 16, headerFontFamily: "Helvetica", headerTextColor: "#064e3b" });
    expect(storageGetSignedUrl).not.toHaveBeenCalled();
    expect(pdfFooterText(branding, "documento gerado pelo sistema")).toContain("Congregação Esperança");
  });

  it("carrega apenas um logótipo PNG com assinatura válida", async () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01]);
    getAppSetting.mockResolvedValue(JSON.stringify({ organizationName: "Igreja Local", logoKey: "organization-branding/logo.png", logoAlignment: "right", logoSize: "large" }));
    storageGetSignedUrl.mockResolvedValue("https://storage.example/logo.png");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(png, { status: 200 })));

    const branding = await loadPdfBranding();

    expect(branding.congregationName).toBe("Igreja Local");
    expect(branding.logoAlignment).toBe("right");
    expect(branding.logoSize).toBe("large");
    expect(branding.logoMimeType).toBe("image/png");
    expect(branding.logoBuffer?.equals(png)).toBe(true);
    expect(storageGetSignedUrl).toHaveBeenCalledWith("organization-branding/logo.png");
  });

  it("aplica as preferências temporárias ao gerar uma amostra", async () => {
    getAppSetting.mockResolvedValue(JSON.stringify({ congregationName: "Nome guardado", logoAlignment: "left", logoSize: "small" }));

    const branding = await loadPdfBranding({ congregationName: "Nome ainda não guardado", logoAlignment: "right", logoSize: "large", headerFontFamily: "Courier", headerTextColor: "#123456", headerFontSizePoints: 27.5 });

    expect(branding.congregationName).toBe("Nome ainda não guardado");
    expect(branding.logoAlignment).toBe("right");
    expect(branding.logoSize).toBe("large");
    expect(branding.headerFontFamily).toBe("Courier");
    expect(branding.headerTextColor).toBe("#123456");
    expect(branding.headerFontSizePoints).toBe(27.5);
  });

  it("normaliza pontos decimais persistidos e mantém o valor no branding", async () => {
    getAppSetting.mockResolvedValue(JSON.stringify({ congregationName: "Igreja Local", headerFontSizePoints: "27,5" }));

    const branding = await loadPdfBranding();

    expect(branding.headerFontSizePoints).toBe(27.5);
  });

  it("passa o tamanho decimal ao PDFKit ao desenhar o cabeçalho", () => {
    const fontSizes: number[] = [];
    const document = {
      y: 0,
      font() { return this; },
      fontSize(size: number) { fontSizes.push(size); return this; },
      widthOfString(text: string) { return text.length * 5; },
      fillColor() { return this; },
      text() { return this; },
      moveTo() { return this; },
      lineTo() { return this; },
      lineWidth() { return this; },
      strokeColor() { return this; },
      stroke() { return this; },
    } as any;

    drawPdfHeader(document, {
      congregationName: "Igreja Local",
      headerTitleText: "Cabeçalho decimal",
      logoBuffer: null,
      logoMimeType: null,
      logoAlignment: "center",
      logoSize: "medium",
      headerTextAlignment: "center",
      headerFontSize: "medium",
      headerFontSizePoints: 27.5,
      headerFontFamily: "Helvetica",
      headerTextColor: "#064e3b",
    }, "RELATÓRIO");

    expect(fontSizes).toContain(27.5);
  });

  it("usa o modelo marcado como padrão quando não existe uma seleção explícita", async () => {
    getAppSetting.mockResolvedValue(JSON.stringify({
      congregationName: "Igreja Local",
      activeTemplateId: "modelo-antigo",
      headerTemplates: [
        { id: "modelo-antigo", name: "Modelo antigo", headerTitleText: "Título antigo", logoAlignment: "left", logoSize: "small" },
        { id: "modelo-padrao", name: "Modelo padrão", headerTitleText: "Cabeçalho padrão", logoAlignment: "right", logoSize: "large", isDefault: true },
      ],
    }));

    const branding = await loadPdfBranding();

    expect(branding.headerTitleText).toBe("Cabeçalho padrão");
    expect(branding.logoAlignment).toBe("right");
    expect(branding.logoSize).toBe("large");
  });

  it("permite substituir o modelo padrão com uma seleção explícita", async () => {
    getAppSetting.mockResolvedValue(JSON.stringify({
      congregationName: "Igreja Local",
      headerTemplates: [
        { id: "modelo-padrao", name: "Modelo padrão", headerTitleText: "Cabeçalho padrão", logoAlignment: "right", logoSize: "large", isDefault: true },
        { id: "modelo-atividade", name: "Modelo atividade", headerTitleText: "Atividade especial", logoAlignment: "left", logoSize: "small" },
      ],
    }));

    const branding = await loadPdfBranding({ templateId: "modelo-atividade" });

    expect(branding.headerTitleText).toBe("Atividade especial");
    expect(branding.logoAlignment).toBe("left");
    expect(branding.logoSize).toBe("small");
  });

  it("volta ao nome predefinido quando a configuração é inválida", async () => {
    getAppSetting.mockResolvedValue("não é JSON");

    const branding = await loadPdfBranding();

    expect(branding.congregationName).toBe(DEFAULT_CONGREGATION_NAME);
    expect(branding.logoAlignment).toBe("center");
    expect(branding.logoSize).toBe("medium");
    expect(branding.logoBuffer).toBeNull();
  });

  it.each([
    ["left", "small", 42],
    ["center", "medium", (595.28 - 52) / 2],
    ["right", "large", 595.28 - 42 - 72],
  ] as const)("posiciona o logótipo %s com tamanho %s", (logoAlignment, logoSize, expectedX) => {
    const imageCalls: Array<[Buffer, number, number, unknown]> = [];
    const document = {
      y: 0,
      image(buffer: Buffer, x: number, y: number, options: unknown) { imageCalls.push([buffer, x, y, options]); return this; },
      fontSize() { return this; },
      fillColor() { return this; },
      text() { return this; },
      moveTo() { return this; },
      lineTo() { return this; },
      lineWidth() { return this; },
      strokeColor() { return this; },
      stroke() { return this; },
    } as any;

    drawPdfHeader(document, {
      congregationName: "Igreja Local",
      logoBuffer: Buffer.from("logo"),
      logoMimeType: "image/png",
      logoAlignment,
      logoSize,
      headerTextAlignment: "center",
      headerFontSize: "medium",
      headerFontFamily: "Helvetica",
      headerTextColor: "#064e3b",
    }, "RELATÓRIO");

    expect(imageCalls).toHaveLength(1);
    expect(imageCalls[0]?.[1]).toBe(expectedX);
    expect(document.y).toBeGreaterThan(0);
  });
});
