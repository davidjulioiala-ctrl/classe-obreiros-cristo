export type AppearanceTheme = "light" | "dark";
export type AppearanceAccent = "emerald" | "blue" | "purple" | "pink";

export type AppearanceSettings = {
  theme: AppearanceTheme;
  accent: AppearanceAccent;
};

const ACCENTS: AppearanceAccent[] = ["emerald", "blue", "purple", "pink"];

export function normalizeAppearanceSettings(value: unknown, fallback: AppearanceSettings): AppearanceSettings {
  if (!value || typeof value !== "object") return fallback;
  const candidate = value as { theme?: unknown; accent?: unknown };
  return {
    theme: candidate.theme === "dark" || candidate.theme === "light" ? candidate.theme : fallback.theme,
    accent: typeof candidate.accent === "string" && ACCENTS.includes(candidate.accent as AppearanceAccent)
      ? candidate.accent as AppearanceAccent
      : fallback.accent,
  };
}

export function parseAppearanceSettings(raw: string | null | undefined, fallback: AppearanceSettings): AppearanceSettings {
  if (!raw) return fallback;
  try {
    return normalizeAppearanceSettings(JSON.parse(raw), fallback);
  } catch {
    return fallback;
  }
}

export function serializeAppearanceSettings(settings: AppearanceSettings): string {
  return JSON.stringify(settings);
}
