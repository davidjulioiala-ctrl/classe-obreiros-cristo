
export type HeaderTextAlignment = "left" | "center" | "right";
export type HeaderFontSizePreset = "small" | "medium" | "large";
export type HeaderFontFamily =
  | "Helvetica"
  | "Times-Roman"
  | "Courier"
  | "Aptos"
  | "Aptos Display"
  | "Aptos Narrow"
  | "Aptos Mono"
  | "Aptos Serif"
  | "Calibri"
  | "Calibri Light"
  | "Cambria"
  | "Cambria Math"
  | "Arial"
  | "Arial Narrow"
  | "Arial Black"
  | "Times New Roman"
  | "Georgia"
  | "Verdana"
  | "Trebuchet MS"
  | "Tahoma"
  | "Consolas"
  | "Courier New"
  | "Century Gothic"
  | "Segoe UI";
export type HeaderPdfFontFamily = "Helvetica" | "Times-Roman" | "Courier";
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

export type HeaderFontFamilyOption = {
  value: HeaderFontFamily;
  label: string;
  cssFamily: string;
  pdfFamily: HeaderPdfFontFamily;
};

/**
 * Catálogo Office-compatible. O browser tenta usar a família escolhida quando
 * estiver instalada; o PDFKit usa apenas as três famílias base incorporadas.
 */
export const HEADER_FONT_FAMILIES: HeaderFontFamilyOption[] = [
  { value: "Aptos", label: "Aptos", cssFamily: "Aptos, Arial, sans-serif", pdfFamily: "Helvetica" },
  { value: "Aptos Display", label: "Aptos Display", cssFamily: "'Aptos Display', Aptos, Arial, sans-serif", pdfFamily: "Helvetica" },
  { value: "Aptos Narrow", label: "Aptos Narrow", cssFamily: "'Aptos Narrow', Aptos, Arial, sans-serif", pdfFamily: "Helvetica" },
  { value: "Aptos Mono", label: "Aptos Mono", cssFamily: "'Aptos Mono', Consolas, monospace", pdfFamily: "Courier" },
  { value: "Aptos Serif", label: "Aptos Serif", cssFamily: "'Aptos Serif', Cambria, Georgia, serif", pdfFamily: "Times-Roman" },
  { value: "Calibri", label: "Calibri", cssFamily: "Calibri, Arial, sans-serif", pdfFamily: "Helvetica" },
  { value: "Calibri Light", label: "Calibri Light", cssFamily: "'Calibri Light', Calibri, Arial, sans-serif", pdfFamily: "Helvetica" },
  { value: "Cambria", label: "Cambria", cssFamily: "Cambria, Georgia, serif", pdfFamily: "Times-Roman" },
  { value: "Cambria Math", label: "Cambria Math", cssFamily: "'Cambria Math', Cambria, serif", pdfFamily: "Times-Roman" },
  { value: "Arial", label: "Arial", cssFamily: "Arial, Helvetica, sans-serif", pdfFamily: "Helvetica" },
  { value: "Arial Narrow", label: "Arial Narrow", cssFamily: "'Arial Narrow', Arial, sans-serif", pdfFamily: "Helvetica" },
  { value: "Arial Black", label: "Arial Black", cssFamily: "'Arial Black', Arial, sans-serif", pdfFamily: "Helvetica" },
  { value: "Times New Roman", label: "Times New Roman", cssFamily: "'Times New Roman', Times, serif", pdfFamily: "Times-Roman" },
  { value: "Georgia", label: "Georgia", cssFamily: "Georgia, serif", pdfFamily: "Times-Roman" },
  { value: "Verdana", label: "Verdana", cssFamily: "Verdana, Arial, sans-serif", pdfFamily: "Helvetica" },
  { value: "Trebuchet MS", label: "Trebuchet MS", cssFamily: "'Trebuchet MS', Arial, sans-serif", pdfFamily: "Helvetica" },
  { value: "Tahoma", label: "Tahoma", cssFamily: "Tahoma, Arial, sans-serif", pdfFamily: "Helvetica" },
  { value: "Consolas", label: "Consolas", cssFamily: "Consolas, monospace", pdfFamily: "Courier" },
  { value: "Courier New", label: "Courier New", cssFamily: "'Courier New', Courier, monospace", pdfFamily: "Courier" },
  { value: "Century Gothic", label: "Century Gothic", cssFamily: "'Century Gothic', Arial, sans-serif", pdfFamily: "Helvetica" },
  { value: "Segoe UI", label: "Segoe UI", cssFamily: "'Segoe UI', Arial, sans-serif", pdfFamily: "Helvetica" },
  { value: "Helvetica", label: "Helvetica (PDF base)", cssFamily: "Helvetica, Arial, sans-serif", pdfFamily: "Helvetica" },
  { value: "Times-Roman", label: "Times New Roman (PDF base)", cssFamily: "'Times New Roman', Times, serif", pdfFamily: "Times-Roman" },
  { value: "Courier", label: "Courier (PDF base)", cssFamily: "Courier, monospace", pdfFamily: "Courier" },
];

export const HEADER_COLOR_PALETTE: Array<{ value: string; label: string; group: "Office theme" | "Cores padrão" }> = [
  { value: "#000000", label: "Texto 1 — Preto", group: "Office theme" },
  { value: "#FFFFFF", label: "Fundo 1 — Branco", group: "Office theme" },
  { value: "#44546A", label: "Texto 2 — Azul escuro", group: "Office theme" },
  { value: "#E7E6E6", label: "Fundo 2 — Cinza claro", group: "Office theme" },
  { value: "#4472C4", label: "Ênfase 1 — Azul", group: "Office theme" },
  { value: "#ED7D31", label: "Ênfase 2 — Laranja", group: "Office theme" },
  { value: "#A5A5A5", label: "Ênfase 3 — Cinza", group: "Office theme" },
  { value: "#FFC000", label: "Ênfase 4 — Dourado", group: "Office theme" },
  { value: "#5B9BD5", label: "Ênfase 5 — Azul claro", group: "Office theme" },
  { value: "#70AD47", label: "Ênfase 6 — Verde", group: "Office theme" },
  { value: "#0563C1", label: "Hiperligação — Azul", group: "Office theme" },
  { value: "#954F72", label: "Hiperligação seguida — Roxo", group: "Office theme" },
  { value: "#F2F2F2", label: "Cinza 10%", group: "Cores padrão" },
  { value: "#D9EAD3", label: "Verde pastel", group: "Cores padrão" },
  { value: "#D9EAF7", label: "Azul pastel", group: "Cores padrão" },
  { value: "#FCE4D6", label: "Laranja pastel", group: "Cores padrão" },
  { value: "#FFF2CC", label: "Amarelo pastel", group: "Cores padrão" },
  { value: "#EADCF8", label: "Roxo pastel", group: "Cores padrão" },
  { value: "#C00000", label: "Vermelho escuro", group: "Cores padrão" },
  { value: "#008000", label: "Verde escuro", group: "Cores padrão" },
  { value: "#0000FF", label: "Azul", group: "Cores padrão" },
  { value: "#FF0000", label: "Vermelho", group: "Cores padrão" },
  { value: "#FFFF00", label: "Amarelo", group: "Cores padrão" },
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
  const option = HEADER_FONT_FAMILIES.find((font) => font.value === value);
  return option?.value ?? "Helvetica";
}

export function getHeaderFontOption(value: unknown): HeaderFontFamilyOption {
  const family = normalizeHeaderFontFamily(value);
  return HEADER_FONT_FAMILIES.find((font) => font.value === family) ?? HEADER_FONT_FAMILIES[HEADER_FONT_FAMILIES.length - 3]!;
}

export function normalizeHeaderPdfFontFamily(value: unknown): HeaderPdfFontFamily {
  return getHeaderFontOption(value).pdfFamily;
}

export function getHeaderFontCssFamily(value: unknown): string {
  return getHeaderFontOption(value).cssFamily;
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
