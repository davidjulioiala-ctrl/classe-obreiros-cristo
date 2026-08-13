import PDFDocument from "pdfkit";
import { getAppSetting } from "./db";
import { storageGetSignedUrl } from "./storage";

export const DEFAULT_CONGREGATION_NAME = "Classe Obreiros de Cristo";

export type LogoAlignment = "left" | "center" | "right";
export type LogoSizePreset = "small" | "medium" | "large";

export type PdfBranding = {
  congregationName: string;
  logoBuffer: Buffer | null;
  logoMimeType: "image/png" | "image/jpeg" | null;
  logoAlignment: LogoAlignment;
  logoSize: LogoSizePreset;
};

type OrganizationSettings = {
  organizationName?: unknown;
  congregationName?: unknown;
  logoKey?: unknown;
  logoAlignment?: unknown;
  logoSize?: unknown;
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
  const logoAlignment: LogoAlignment = settings.logoAlignment === "left" || settings.logoAlignment === "right" ? settings.logoAlignment : "center";
  const logoSize: LogoSizePreset = settings.logoSize === "small" || settings.logoSize === "large" ? settings.logoSize : "medium";

  if (!logoKey) return { congregationName, logoBuffer: null, logoMimeType: null, logoAlignment, logoSize };

  try {
    const signedUrl = await storageGetSignedUrl(logoKey);
    const response = await fetch(signedUrl);
    if (!response.ok) return { congregationName, logoBuffer: null, logoMimeType: null, logoAlignment, logoSize };
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length === 0 || bytes.length > 5 * 1024 * 1024) return { congregationName, logoBuffer: null, logoMimeType: null, logoAlignment, logoSize };
    const logoMimeType = detectLogoType(bytes);
    return logoMimeType ? { congregationName, logoBuffer: bytes, logoMimeType, logoAlignment, logoSize } : { congregationName, logoBuffer: null, logoMimeType: null, logoAlignment, logoSize };
  } catch (error) {
    console.warn("[PdfBranding] Não foi possível carregar o logótipo configurado:", error);
    return { congregationName, logoBuffer: null, logoMimeType: null, logoAlignment, logoSize };
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

  const sizeMap: Record<LogoSizePreset, number> = {
    small: 36,
    medium: 52,
    large: 72,
  };
  const logoDim = branding.logoBuffer ? sizeMap[branding.logoSize] : 0;

  if (branding.logoBuffer && branding.logoMimeType) {
    if (branding.logoAlignment === "left") {
      document.image(branding.logoBuffer, 42, headerTop, { fit: [logoDim, logoDim] });
      const textX = 42 + logoDim + 12;
      const textWidth = contentWidth - logoDim - 12;
      document.fontSize(16).fillColor("#064e3b").text(branding.congregationName, textX, headerTop + 2, { width: textWidth, align: "left" });
      document.fontSize(9).fillColor("#64748b").text(options.subtitle ?? "Sistema de Gestão Eclesiástica", textX, headerTop + 22, { width: textWidth, align: "left" });
      document.fontSize(13).fillColor("#047857").text(title, textX, headerTop + 38, { width: textWidth, align: "left" });
    } else if (branding.logoAlignment === "right") {
      const textX = 42;
      const textWidth = contentWidth - logoDim - 12;
      document.fontSize(16).fillColor("#064e3b").text(branding.congregationName, textX, headerTop + 2, { width: textWidth, align: "left" });
      document.fontSize(9).fillColor("#64748b").text(options.subtitle ?? "Sistema de Gestão Eclesiástica", textX, headerTop + 22, { width: textWidth, align: "left" });
      document.fontSize(13).fillColor("#047857").text(title, textX, headerTop + 38, { width: textWidth, align: "left" });
      document.image(branding.logoBuffer, pageWidth - 42 - logoDim, headerTop, { fit: [logoDim, logoDim] });
    } else {
      // center alignment: logo on top, texts centered underneath
      const currentLogoH = Math.max(logoDim, 40);
      document.image(branding.logoBuffer, (pageWidth - logoDim) / 2, headerTop, { fit: [logoDim, logoDim] });
      const textY = headerTop + currentLogoH + 6;
      document.fontSize(16).fillColor("#064e3b").text(branding.congregationName, 42, textY, { width: contentWidth, align: "center" });
      document.fontSize(9).fillColor("#64748b").text(options.subtitle ?? "Sistema de Gestão Eclesiástica", 42, textY + 20, { width: contentWidth, align: "center" });
      document.fontSize(13).fillColor("#047857").text(title, 42, textY + 36, { width: contentWidth, align: "center" });
      const dividerY = textY + 58;
      document.moveTo(42, dividerY).lineTo(pageWidth - 42, dividerY).lineWidth(0.8).strokeColor("#a7f3d0").stroke();
      document.y = dividerY + 10;
      return;
    }
  } else {
    // no logo
    document.fontSize(16).fillColor("#064e3b").text(branding.congregationName, 42, headerTop + 2, { width: contentWidth, align: "center" });
    document.fontSize(9).fillColor("#64748b").text(options.subtitle ?? "Sistema de Gestão Eclesiástica", 42, headerTop + 22, { width: contentWidth, align: "center" });
    document.fontSize(13).fillColor("#047857").text(title, 42, headerTop + 38, { width: contentWidth, align: "center" });
  }

  const dividerY = headerTop + Math.max(logoDim, 62) + 6;
  document.moveTo(42, dividerY).lineTo(pageWidth - 42, dividerY).lineWidth(0.8).strokeColor("#a7f3d0").stroke();
  document.y = dividerY + 10;
}

export function pdfFooterText(branding: PdfBranding, suffix: string) {
  return `${branding.congregationName} — ${suffix}`;
}

export function pdfImageSource(branding: PdfBranding) {
  return branding.logoBuffer && branding.logoMimeType ? branding.logoBuffer : null;
}

