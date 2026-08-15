import { createContext, useCallback, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";
type AccentColor = "emerald" | "blue" | "purple" | "pink";

const ACCENT_PALETTES: Record<AccentColor, {
  primary: string;
  ring: string;
  chart: [string, string, string, string, string];
}> = {
  emerald: {
    primary: "#059669",
    ring: "#10b981",
    chart: ["#6ee7b7", "#34d399", "#10b981", "#059669", "#047857"],
  },
  blue: {
    primary: "#2563eb",
    ring: "#3b82f6",
    chart: ["#93c5fd", "#60a5fa", "#3b82f6", "#2563eb", "#1d4ed8"],
  },
  purple: {
    primary: "#7c3aed",
    ring: "#8b5cf6",
    chart: ["#c4b5fd", "#a78bfa", "#8b5cf6", "#7c3aed", "#6d28d9"],
  },
  pink: {
    primary: "#db2777",
    ring: "#ec4899",
    chart: ["#f9a8d4", "#f472b6", "#ec4899", "#db2777", "#be185d"],
  },
};

function isAccentColor(value: string | null): value is AccentColor {
  return value === "emerald" || value === "blue" || value === "purple" || value === "pink";
}

function readStoredAccent() {
  if (typeof window === "undefined") return "emerald" as AccentColor;
  const stored = window.localStorage.getItem("accentColor");
  return isAccentColor(stored) ? stored : "emerald";
}

function applyAccentVariables(accent: AccentColor) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const palette = ACCENT_PALETTES[accent];
  root.dataset.accent = accent;
  root.style.setProperty("--primary", palette.primary);
  root.style.setProperty("--primary-foreground", "#ffffff");
  root.style.setProperty("--sidebar-primary", palette.primary);
  root.style.setProperty("--sidebar-primary-foreground", "#ffffff");
  root.style.setProperty("--ring", palette.ring);
  palette.chart.forEach((color, index) => root.style.setProperty(`--chart-${index + 1}`, color));
}

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  accentColor: AccentColor;
  setAccentColor: (accent: AccentColor) => void;
  switchable: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  switchable?: boolean;
}

export function ThemeProvider({
  children,
  defaultTheme = "light",
  switchable = true,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return defaultTheme;
    const stored = window.localStorage.getItem("theme");
    return stored === "dark" || stored === "light" ? stored : defaultTheme;
  });
  const [accentColor, setAccentState] = useState<AccentColor>(readStoredAccent);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    if (switchable) window.localStorage.setItem("theme", theme);
  }, [theme, switchable]);

  useEffect(() => {
    applyAccentVariables(accentColor);
    if (switchable) window.localStorage.setItem("accentColor", accentColor);
  }, [accentColor, switchable]);

  const setTheme = useCallback((nextTheme: Theme) => {
    if (!switchable) return;
    setThemeState(nextTheme);
  }, [switchable]);

  const toggleTheme = useCallback(() => {
    if (!switchable) return;
    setThemeState((previous) => (previous === "light" ? "dark" : "light"));
  }, [switchable]);

  const setAccentColor = useCallback((nextAccent: AccentColor) => {
    if (!switchable) return;
    setAccentState(nextAccent);
  }, [switchable]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, accentColor, setAccentColor, switchable }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}

export type { AccentColor, Theme };
export { ACCENT_PALETTES, isAccentColor };
