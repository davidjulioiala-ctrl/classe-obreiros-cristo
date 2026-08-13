import { describe, expect, it, vi } from "vitest";
import { printPdfFrame } from "./pdfPrint";

describe("printPdfFrame", () => {
  it("imprime a janela do PDF depois de a focar", () => {
    const focus = vi.fn();
    const print = vi.fn();

    expect(printPdfFrame({ contentWindow: { focus, print } })).toBe(true);
    expect(focus).toHaveBeenCalledOnce();
    expect(print).toHaveBeenCalledOnce();
  });

  it("não tenta imprimir enquanto o iframe ainda não tem janela", () => {
    expect(printPdfFrame(null)).toBe(false);
    expect(printPdfFrame({ contentWindow: null })).toBe(false);
  });
});
