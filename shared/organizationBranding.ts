export const DEFAULT_ORGANIZATION_NAME = "Classe Obreiros de Cristo";

export type PublicOrganizationBranding = {
  organizationName: string;
  logoUrl: string | null;
};

export function parsePublicOrganizationBranding(raw: string | null | undefined): PublicOrganizationBranding {
  if (!raw) {
    return { organizationName: DEFAULT_ORGANIZATION_NAME, logoUrl: null };
  }

  try {
    const parsed = JSON.parse(raw) as { organizationName?: unknown; logoUrl?: unknown };
    const organizationName = typeof parsed.organizationName === "string" && parsed.organizationName.trim()
      ? parsed.organizationName.trim()
      : DEFAULT_ORGANIZATION_NAME;
    const logoUrl = typeof parsed.logoUrl === "string" && parsed.logoUrl.trim()
      ? parsed.logoUrl.trim()
      : null;
    return { organizationName, logoUrl };
  } catch {
    return { organizationName: DEFAULT_ORGANIZATION_NAME, logoUrl: null };
  }
}
