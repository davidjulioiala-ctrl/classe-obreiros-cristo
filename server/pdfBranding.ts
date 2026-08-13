import PDFDocument from "pdfkit";
import { getAppSetting } from "./db";
import { storageGetSignedUrl } from "./storage";

export const DEFAULT_CONGREGATION_NAME = "Classe Obreiros de Cristo";

export type PdfBranding = {
  congregationName: string;
  logoBuffer: Buffer | null;
  logoMimeType: "image/png" | "image/jpeg" | null;
};

type OrganizationSettings = {
  organizationName?: unknown;
  congregationName?: unknown;
  logoKey?: unknown;
};

function normalizeName(value: unknown) {
  if (typeof value !== "string") return DEFAULT_CONGREGATION_NAME;
  const normalized = value.trim().replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 180);
  return normalized || DEFAULT_CONGREGATION_NAME;
}

function parseOrganizationSettings(value: string | null) {
  if (!value) return {} as OrganizationSettings;
  try {
    const parsed = JSON.parse(value) as OrganizationSettings;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {} as OrganizationSettings;
  }
}

function detectLogoType(buffer: Buffer): PdfBranding["logoMimeType"] {
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return "image/jpeg";
  return null;
}

export async function loadPdfBranding(): Promise<PdfBranding> {
  let settings: OrganizationSettings = {};
  try {
    settings = parseOrganizationSettings(await getAppSetting("organization"));
  } catch (error) {
    console.warn("[PdfBranding] Não foi possível ler as definições da organização:", error);
  }
  const congregationName = normalizeName(settings.congregationName ?? settings.organizationName);
  const logoKey = typeof settings.logoKey === "string" ? settings.logoKey.trim().slice(0, 512) : "";
  if (!logoKey) return { congregationName, logoBuffer: null, logoMimeType: null };

  try {
    const signedUrl = await storageGetSignedUrl(logoKey);
    const response = await fetch(signedUrl);
    if (!response.ok) return { congregationName, logoBuffer: null, logoMimeType: null };
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length === 0 || bytes.length > 5 * 1024 * 1024) return { congregationName, logoBuffer: null, logoMimeType: null };
    const logoMimeType = detectLogoType(bytes);
    return logoMimeType ? { congregationName, logoBuffer: bytes, logoMimeType } : { congregationName, logoBuffer: null, logoMimeType: null };
  } catch (error) {
    console.warn("[PdfBranding] Não foi possível carregar o logótipo configurado:", error);
    return { congregationName, logoBuffer: null, logoMimeType: null };
  }
}

export function drawPdfHeader(
  document: InstanceType<typeof PDFDocument>,
  branding: PdfBranding,
  title: string,
  options: { subtitle?: string; landscape?: boolean } = {}
) {
  const pageWidth = options.landscape ? 841.89 : 595.28;
  const contentWidth = pageWidth - 84;
  const headerTop = document.y;
  const logoSize = branding.logoBuffer ? 52 : 0;
  const textX = branding.logoBuffer ? 42 + logoSize + 12 : 42;
  const textWidth = branding.logoBuffer ? contentWidth - logoSize - 12 : contentWidth;

  if (branding.logoBuffer && branding.logoMimeType) {
    document.image(branding.logoBuffer, 42, headerTop, { fit: [logoSize, logoSize], align: "center", valign: "center" });
  }

  document.fontSize(16).fillColor("#064e3b").text(branding.congregationName, textX, headerTop + 4, { width: textWidth, align: "center" });
  document.fontSize(9).fillColor("#64748b").text(options.subtitle ?? "Sistema de Gestão Eclesiástica", textX, headerTop + 25, { width: textWidth, align: "center" });
  document.fontSize(13).fillColor("#047857").text(title, textX, headerTop + 42, { width: textWidth, align: "center" });
  document.moveTo(42, headerTop + 68).lineTo(pageWidth - 42, headerTop + 68).lineWidth(0.8).strokeColor("#a7f3d0").stroke();
  document.y = headerTop + 78;
}

export function pdfFooterText(branding: PdfBranding, suffix: string) {
  return `${branding.congregationName} — ${suffix}`;
}

export function pdfImageSource(branding: PdfBranding) {
  return branding.logoBuffer && branding.logoMimeType ? branding.logoBuffer : null;
}

