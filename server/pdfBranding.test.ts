import { afterEach, describe, expect, it, vi } from "vitest";
import { loadPdfBranding, pdfFooterText, DEFAULT_CONGREGATION_NAME } from "./pdfBranding";

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

    expect(branding).toEqual({ congregationName: "Congregação Esperança", logoBuffer: null, logoMimeType: null });
    expect(storageGetSignedUrl).not.toHaveBeenCalled();
    expect(pdfFooterText(branding, "documento gerado pelo sistema")).toContain("Congregação Esperança");
  });

  it("carrega apenas um logótipo PNG com assinatura válida", async () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01]);
    getAppSetting.mockResolvedValue(JSON.stringify({ organizationName: "Igreja Local", logoKey: "organization-branding/logo.png" }));
    storageGetSignedUrl.mockResolvedValue("https://storage.example/logo.png");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(png, { status: 200 })));

    const branding = await loadPdfBranding();

    expect(branding.congregationName).toBe("Igreja Local");
    expect(branding.logoMimeType).toBe("image/png");
    expect(branding.logoBuffer?.equals(png)).toBe(true);
    expect(storageGetSignedUrl).toHaveBeenCalledWith("organization-branding/logo.png");
  });

  it("volta ao nome predefinido quando a configuração é inválida", async () => {
    getAppSetting.mockResolvedValue("não é JSON");

    const branding = await loadPdfBranding();

    expect(branding.congregationName).toBe(DEFAULT_CONGREGATION_NAME);
    expect(branding.logoBuffer).toBeNull();
  });
});
