import { describe, expect, it } from "vitest";
import {
  normalizeAppearanceSettings,
  parseAppearanceSettings,
  serializeAppearanceSettings,
} from "../client/src/lib/appearanceSettings";

describe("appearance settings", () => {
  const fallback = { theme: "light" as const, accent: "emerald" as const };

  it("normalizes valid server values without losing the selected accent", () => {
    expect(normalizeAppearanceSettings({ theme: "dark", accent: "blue" }, fallback)).toEqual({
      theme: "dark",
      accent: "blue",
    });
  });

  it("falls back safely when the saved payload is invalid", () => {
    expect(parseAppearanceSettings("{invalid", fallback)).toEqual(fallback);
    expect(parseAppearanceSettings(JSON.stringify({ theme: "unknown", accent: "orange" }), fallback)).toEqual(fallback);
  });

  it("round-trips the payload used by the appearance mutation", () => {
    const value = { theme: "dark" as const, accent: "purple" as const };
    expect(parseAppearanceSettings(serializeAppearanceSettings(value), fallback)).toEqual(value);
  });
});
