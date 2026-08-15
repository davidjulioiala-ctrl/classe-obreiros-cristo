import { describe, expect, it } from "vitest";
import { DEFAULT_ORGANIZATION_NAME, parsePublicOrganizationBranding } from "./organizationBranding";

describe("branding público da organização", () => {
  it("devolve o nome e o logótipo guardados", () => {
    expect(parsePublicOrganizationBranding(JSON.stringify({ organizationName: "Igreja Esperança", logoUrl: "https://cdn.example/logo.png" }))).toEqual({
      organizationName: "Igreja Esperança",
      logoUrl: "https://cdn.example/logo.png",
    });
  });

  it("usa o fallback quando não existe configuração válida", () => {
    expect(parsePublicOrganizationBranding(null)).toEqual({ organizationName: DEFAULT_ORGANIZATION_NAME, logoUrl: null });
    expect(parsePublicOrganizationBranding("not-json")).toEqual({ organizationName: DEFAULT_ORGANIZATION_NAME, logoUrl: null });
  });

  it("limpa espaços e ignora logótipos vazios", () => {
    expect(parsePublicOrganizationBranding(JSON.stringify({ organizationName: "  Comunidade  ", logoUrl: "  " }))).toEqual({
      organizationName: "Comunidade",
      logoUrl: null,
    });
  });
});
