type PrintableWindow = Pick<Window, "focus" | "print">;

type PrintableFrame = { contentWindow: PrintableWindow | null };

export function printPdfFrame(frame: PrintableFrame | null): boolean {
  const previewWindow = frame?.contentWindow;
  if (!previewWindow) return false;

  previewWindow.focus();
  previewWindow.print();
  return true;
}
