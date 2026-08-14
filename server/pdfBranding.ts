import PDFDocument from "pdfkit";
import { getAppSetting } from "./db";
import { storageGetSignedUrl } from "./storage";
import { HEADER_FONT_SIZE_POINTS, normalizeHeaderFontSize, normalizeHeaderTextAlignment, parseHeaderText, type HeaderFontSizePreset, type HeaderTextAlignment, type HeaderTextSegment } from "@shared/headerFormatting";

export const DEFAULT_CONGREGATION_NAME = "Classe Obreiros de Cristo";

export type LogoAlignment = "left" | "center" | "right";
export type LogoSizePreset = "small" | "medium" | "large";

export type PdfBranding = {
  congregationName: string;
  headerTitleText: string;
  logoBuffer: Buffer | null;
  logoMimeType: "image/png" | "image/jpeg" | null;
  logoAlignment: LogoAlignment;
  logoSize: LogoSizePreset;
  headerTextAlignment: HeaderTextAlignment;
  headerFontSize: HeaderFontSizePreset;
};

type OrganizationSettings = {
  organizationName?: unknown;
  congregationName?: unknown;
  headerTitleText?: unknown;
  logoKey?: unknown;
  logoAlignment?: unknown;
  logoSize?: unknown;
  headerTextAlignment?: unknown;
  headerFontSize?: unknown;
  headerTemplates?: unknown;
  activeTemplateId?: unknown;
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

export type PdfHeaderTemplate = {
  id: string;
  name: string;
  headerTitleText: string;
  logoAlignment: LogoAlignment;
  logoSize: LogoSizePreset;
  headerTextAlignment?: HeaderTextAlignment;
  headerFontSize?: HeaderFontSizePreset;
  isDefault?: boolean;
};

export type PdfBrandingOverrides = {
  congregationName?: unknown;
  headerTitleText?: unknown;
  logoAlignment?: unknown;
  logoSize?: unknown;
  headerTextAlignment?: unknown;
  headerFontSize?: unknown;
  templateId?: unknown;
};

export async function loadPdfBranding(overrides: PdfBrandingOverrides = {}): Promise<PdfBranding> {
  let settings: OrganizationSettings = {};
  try {
    settings = parseOrganizationSettings(await getAppSetting("organization"));
  } catch (error) {
    console.warn("[PdfBranding] Não foi possível ler as definições da organização:", error);
  }
  const congregationName = normalizeName(overrides.congregationName ?? settings.congregationName ?? settings.organizationName);
  
  let selectedHeaderTitle = typeof overrides.headerTitleText === "string" && overrides.headerTitleText.trim() ? overrides.headerTitleText.trim() : null;
  let selectedAlignment = overrides.logoAlignment;
  let selectedSize = overrides.logoSize;
  let selectedTextAlignment = overrides.headerTextAlignment;
  let selectedFontSize = overrides.headerFontSize;

  const templates = Array.isArray(settings.headerTemplates) ? (settings.headerTemplates as PdfHeaderTemplate[]) : [];
  const explicitTemplateId = typeof overrides.templateId === "string" && overrides.templateId.trim() ? overrides.templateId.trim() : null;
  const matchedTemplate = explicitTemplateId
    ? templates.find((t) => t && t.id === explicitTemplateId) || templates.find((t) => t && t.isDefault) || templates[0]
    : templates.find((t) => t && t.isDefault) || templates.find((t) => t && t.id === settings.activeTemplateId) || templates[0];

  if (!selectedHeaderTitle && matchedTemplate && typeof matchedTemplate.headerTitleText === "string") {
    selectedHeaderTitle = matchedTemplate.headerTitleText;
  }
  if (!selectedAlignment && matchedTemplate && (matchedTemplate.logoAlignment === "left" || matchedTemplate.logoAlignment === "center" || matchedTemplate.logoAlignment === "right")) {
    selectedAlignment = matchedTemplate.logoAlignment;
  }
  if (!selectedSize && matchedTemplate && (matchedTemplate.logoSize === "small" || matchedTemplate.logoSize === "medium" || matchedTemplate.logoSize === "large")) {
    selectedSize = matchedTemplate.logoSize;
  }
  if (!selectedTextAlignment && matchedTemplate?.headerTextAlignment) selectedTextAlignment = matchedTemplate.headerTextAlignment;
  if (!selectedFontSize && matchedTemplate?.headerFontSize) selectedFontSize = matchedTemplate.headerFontSize;

  const headerTitleText = selectedHeaderTitle ? selectedHeaderTitle.slice(0, 250) : congregationName;
  const logoKey = typeof settings.logoKey === "string" ? settings.logoKey.trim().slice(0, 512) : "";
  const requestedAlignment = selectedAlignment ?? settings.logoAlignment;
  const requestedSize = selectedSize ?? settings.logoSize;
  const logoAlignment: LogoAlignment = requestedAlignment === "left" || requestedAlignment === "right" ? requestedAlignment : "center";
  const logoSize: LogoSizePreset = requestedSize === "small" || requestedSize === "large" ? requestedSize : "medium";
  const headerTextAlignment = normalizeHeaderTextAlignment(selectedTextAlignment ?? settings.headerTextAlignment);
  const headerFontSize = normalizeHeaderFontSize(selectedFontSize ?? settings.headerFontSize);

  if (!logoKey) return { congregationName, headerTitleText, logoBuffer: null, logoMimeType: null, logoAlignment, logoSize, headerTextAlignment, headerFontSize };

  try {
    const signedUrl = await storageGetSignedUrl(logoKey);
    const response = await fetch(signedUrl);
    if (!response.ok) return { congregationName, headerTitleText, logoBuffer: null, logoMimeType: null, logoAlignment, logoSize, headerTextAlignment, headerFontSize };
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length === 0 || bytes.length > 5 * 1024 * 1024) return { congregationName, headerTitleText, logoBuffer: null, logoMimeType: null, logoAlignment, logoSize, headerTextAlignment, headerFontSize };
    const logoMimeType = detectLogoType(bytes);
    return logoMimeType ? { congregationName, headerTitleText, logoBuffer: bytes, logoMimeType, logoAlignment, logoSize, headerTextAlignment, headerFontSize } : { congregationName, headerTitleText, logoBuffer: null, logoMimeType: null, logoAlignment, logoSize, headerTextAlignment, headerFontSize };
  } catch (error) {
    console.warn("[PdfBranding] Não foi possível carregar o logótipo configurado:", error);
    return { congregationName, headerTitleText, logoBuffer: null, logoMimeType: null, logoAlignment, logoSize, headerTextAlignment, headerFontSize };
  }
}

function headerFont(segment: HeaderTextSegment) {
  if (segment.bold && segment.italic) return "Helvetica-BoldOblique";
  if (segment.bold) return "Helvetica-Bold";
  if (segment.italic) return "Helvetica-Oblique";
  return "Helvetica";
}

function drawFormattedHeaderText(
  document: InstanceType<typeof PDFDocument>,
  value: string,
  x: number,
  y: number,
  width: number,
  options: { fontSize: number; color: string; align: "left" | "center" | "right" },
) {
  const lines = parseHeaderText(value);
  const lineHeight = options.fontSize * 1.25;
  const compatibleDocument = document as InstanceType<typeof PDFDocument> & {
    font?: (name: string) => InstanceType<typeof PDFDocument>;
    widthOfString?: (text: string) => number;
  };
  const setFont = (segment: HeaderTextSegment) => {
    compatibleDocument.font?.(headerFont(segment));
    compatibleDocument.fontSize(options.fontSize);
  };

  lines.forEach((line, lineIndex) => {
    const widths = line.map((segment) => {
      setFont(segment);
      return compatibleDocument.widthOfString?.(segment.text) ?? segment.text.length * options.fontSize * 0.55;
    });
    const totalWidth = widths.reduce((sum, segmentWidth) => sum + segmentWidth, 0);
    const startX = options.align === "center" ? x + Math.max(0, (width - totalWidth) / 2) : options.align === "right" ? x + Math.max(0, width - totalWidth) : x;
    let currentX = startX;

    line.forEach((segment, segmentIndex) => {
      setFont(segment);
      document
        .fillColor(options.color)
        .text(segment.text, currentX, y + lineIndex * lineHeight, { underline: segment.underline, lineBreak: false });
      currentX += widths[segmentIndex] ?? 0;
    });
  });

  return Math.max(lineHeight, lines.length * lineHeight);
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
  const headerTextFontSize = HEADER_FONT_SIZE_POINTS[normalizeHeaderFontSize(branding.headerFontSize)];
  const textAlignment = normalizeHeaderTextAlignment(branding.headerTextAlignment);
  const headerTitleHeight = Math.max(20, parseHeaderText(branding.headerTitleText).length * headerTextFontSize * 1.25);

  if (branding.logoBuffer && branding.logoMimeType) {
    if (branding.logoAlignment === "left") {
      document.image(branding.logoBuffer, 42, headerTop, { fit: [logoDim, logoDim] });
      const textX = 42 + logoDim + 12;
      const textWidth = contentWidth - logoDim - 12;
      const titleHeight = drawFormattedHeaderText(document, branding.headerTitleText, textX, headerTop + 2, textWidth, { fontSize: headerTextFontSize, color: "#064e3b", align: textAlignment });
      const subtitleY = headerTop + 2 + titleHeight + 3;
      document.fontSize(9).fillColor("#64748b").text(options.subtitle ?? "Sistema de Gestão Eclesiástica", textX, subtitleY, { width: textWidth, align: textAlignment });
      document.fontSize(13).fillColor("#047857").text(title, textX, subtitleY + 16, { width: textWidth, align: textAlignment });
    } else if (branding.logoAlignment === "right") {
      const textX = 42;
      const textWidth = contentWidth - logoDim - 12;
      const titleHeight = drawFormattedHeaderText(document, branding.headerTitleText, textX, headerTop + 2, textWidth, { fontSize: headerTextFontSize, color: "#064e3b", align: textAlignment });
      const subtitleY = headerTop + 2 + titleHeight + 3;
      document.fontSize(9).fillColor("#64748b").text(options.subtitle ?? "Sistema de Gestão Eclesiástica", textX, subtitleY, { width: textWidth, align: textAlignment });
      document.fontSize(13).fillColor("#047857").text(title, textX, subtitleY + 16, { width: textWidth, align: textAlignment });
      document.image(branding.logoBuffer, pageWidth - 42 - logoDim, headerTop, { fit: [logoDim, logoDim] });
    } else {
      // center alignment: logo on top, texts centered underneath
      const currentLogoH = Math.max(logoDim, 40);
      document.image(branding.logoBuffer, (pageWidth - logoDim) / 2, headerTop, { fit: [logoDim, logoDim] });
      const textY = headerTop + currentLogoH + 6;
      const titleHeight = drawFormattedHeaderText(document, branding.headerTitleText, 42, textY, contentWidth, { fontSize: headerTextFontSize, color: "#064e3b", align: textAlignment });
      const subtitleY = textY + titleHeight + 3;
      document.fontSize(9).fillColor("#64748b").text(options.subtitle ?? "Sistema de Gestão Eclesiástica", 42, subtitleY, { width: contentWidth, align: textAlignment });
      document.fontSize(13).fillColor("#047857").text(title, 42, subtitleY + 16, { width: contentWidth, align: textAlignment });
      const dividerY = subtitleY + 34;
      document.moveTo(42, dividerY).lineTo(pageWidth - 42, dividerY).lineWidth(0.8).strokeColor("#a7f3d0").stroke();
      document.y = dividerY + 10;
      return;
    }
  } else {
    // no logo
    drawFormattedHeaderText(document, branding.headerTitleText, 42, headerTop + 2, contentWidth, { fontSize: headerTextFontSize, color: "#064e3b", align: textAlignment });
    const subtitleY = headerTop + 2 + headerTitleHeight + 3;
    document.fontSize(9).fillColor("#64748b").text(options.subtitle ?? "Sistema de Gestão Eclesiástica", 42, subtitleY, { width: contentWidth, align: textAlignment });
    document.fontSize(13).fillColor("#047857").text(title, 42, subtitleY + 16, { width: contentWidth, align: textAlignment });
  }

  const dividerY = headerTop + Math.max(logoDim, headerTitleHeight + 42, 62) + 6;
  document.moveTo(42, dividerY).lineTo(pageWidth - 42, dividerY).lineWidth(0.8).strokeColor("#a7f3d0").stroke();
  document.y = dividerY + 10;
}

export function pdfFooterText(branding: PdfBranding, suffix: string) {
  return `${branding.congregationName} — ${suffix}`;
}

export function pdfImageSource(branding: PdfBranding) {
  return branding.logoBuffer && branding.logoMimeType ? branding.logoBuffer : null;
}

