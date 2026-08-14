
export type HeaderTextAlignment = "left" | "center" | "right";
export type HeaderFontSizePreset = "small" | "medium" | "large";
export type HeaderFontFamily = "Helvetica" | "Times-Roman" | "Courier";
export type HeaderFormatTag = "b" | "i" | "u";

export const DEFAULT_HEADER_TEXT_COLOR = "#064e3b";

export const HEADER_FONT_SIZE_POINTS: Record<HeaderFontSizePreset, number> = {
  small: 12,
  medium: 16,
  large: 20,
};

export const MIN_HEADER_FONT_SIZE_POINTS = 8;
export const MAX_HEADER_FONT_SIZE_POINTS = 72;
export const DEFAULT_HEADER_FONT_SIZE_POINTS = HEADER_FONT_SIZE_POINTS.medium;

export const HEADER_FONT_FAMILIES: Array<{ value: HeaderFontFamily; label: string }> = [
  { value: "Helvetica", label: "Helvetica" },
  { value: "Times-Roman", label: "Times New Roman" },
  { value: "Courier", label: "Courier" },
];

export function normalizeHeaderTextAlignment(value: unknown): HeaderTextAlignment {
  return value === "left" || value === "right" ? value : "center";
}

export function normalizeHeaderFontSize(value: unknown): HeaderFontSizePreset {
  return value === "small" || value === "large" ? value : "medium";
}

export function normalizeHeaderFontSizePoints(value: unknown, fallback = DEFAULT_HEADER_FONT_SIZE_POINTS): number {
  const safeFallback = Number.isFinite(fallback)
    ? Math.min(MAX_HEADER_FONT_SIZE_POINTS, Math.max(MIN_HEADER_FONT_SIZE_POINTS, fallback))
    : DEFAULT_HEADER_FONT_SIZE_POINTS;
  const numeric = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value.trim().replace(",", ".")) : Number.NaN;
  if (!Number.isFinite(numeric)) return safeFallback;
  const clamped = Math.min(MAX_HEADER_FONT_SIZE_POINTS, Math.max(MIN_HEADER_FONT_SIZE_POINTS, numeric));
  return Math.round(clamped * 10) / 10;
}

export function normalizeHeaderFontFamily(value: unknown): HeaderFontFamily {
  return value === "Times-Roman" || value === "Courier" ? value : "Helvetica";
}

export function normalizeHeaderTextColor(value: unknown): string {
  if (typeof value !== "string") return DEFAULT_HEADER_TEXT_COLOR;
  const normalized = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(normalized)) return normalized;
  if (/^#[0-9a-f]{3}$/.test(normalized)) {
    return `#${normalized.slice(1).split("").map((digit) => `${digit}${digit}`).join("")}`;
  }
  return DEFAULT_HEADER_TEXT_COLOR;
}

export type HeaderTextSegment = {
  text: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
};

export type HeaderTextLine = HeaderTextSegment[];

const TAG_PATTERN = /\[(b|i|u)\]([\s\S]*?)\[\/\1\]/gi;

/**
 * Interpreta apenas as marcações criadas pela barra de formatação do cabeçalho.
 * O texto continua a ser texto simples e as quebras de linha são preservadas.
 */
export function parseHeaderText(value: string): HeaderTextLine[] {
  const safeValue = typeof value === "string" ? value.slice(0, 250) : "";
  return safeValue.split(/\r?\n/).map((line) => {
    const segments: HeaderTextSegment[] = [];
    let cursor = 0;

    const matcher = new RegExp(TAG_PATTERN.source, "gi");
    let match = matcher.exec(line);
    while (match) {
      const start = match.index ?? 0;
      if (start > cursor) {
        segments.push({ text: line.slice(cursor, start), bold: false, italic: false, underline: false });
      }
      const tag = match[1]?.toLowerCase();
      segments.push({
        text: match[2] ?? "",
        bold: tag === "b",
        italic: tag === "i",
        underline: tag === "u",
      });
      cursor = start + match[0].length;
      match = matcher.exec(line);
    }

    if (cursor < line.length) {
      segments.push({ text: line.slice(cursor), bold: false, italic: false, underline: false });
    }
    if (segments.length === 0) segments.push({ text: "", bold: false, italic: false, underline: false });
    return segments;
  });
}
