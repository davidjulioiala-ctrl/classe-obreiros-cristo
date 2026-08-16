import { describe, expect, it } from "vitest";
import { PageLoadingSkeleton } from "./PageLoadingSkeleton";

describe("PageLoadingSkeleton", () => {
  it("expõe estado de carregamento acessível para listas", () => {
    const element = PageLoadingSkeleton({ variant: "list", rows: 3 });
    expect(element.props["aria-busy"]).toBe("true");
    expect(element.props["aria-label"]).toBe("A carregar dados");
    expect(element.props.children[0].props.children).toBe("A carregar dados…");
  });

  it("mantém variantes de tabela e cartões para diferentes layouts", () => {
    expect(PageLoadingSkeleton({ variant: "table" }).props.children).toBeTruthy();
    expect(PageLoadingSkeleton({ variant: "cards" }).props.children).toBeTruthy();
  });
});
