export type PdfPreviewLogoSize = "small" | "medium" | "large";

export const PDF_PREVIEW_LOGO_SIZES: Record<PdfPreviewLogoSize, number> = {
  small: 48,
  medium: 72,
  large: 96,
};

export function getPdfPreviewLogoSize(size: PdfPreviewLogoSize) {
  return PDF_PREVIEW_LOGO_SIZES[size];
}

export function getPdfPreviewName(value: string) {
  return value.trim() || "Nome da congregação";
}
