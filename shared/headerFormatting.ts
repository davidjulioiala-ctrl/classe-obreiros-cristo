export type HeaderFormatTag = "b" | "i" | "u";

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
