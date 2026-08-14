export type ExportColumnPreset = {
  id: string;
  name: string;
  keys: string[];
  builtIn?: boolean;
};

const STORAGE_KEY = "classe-obreiros-cristo.export-column-presets.v1";

export const DEFAULT_EXPORT_COLUMN_PRESETS: ExportColumnPreset[] = [
  {
    id: "summary",
    name: "Resumo geral",
    keys: ["id", "name", "sex", "position", "groupId", "isGuest", "isActive"],
    builtIn: true,
  },
  {
    id: "contact",
    name: "Dados de contacto",
    keys: ["id", "name", "phoneOrange", "phoneTelecel", "email"],
    builtIn: true,
  },
  {
    id: "complete",
    name: "Completo",
    keys: ["id", "name", "sex", "birthDate", "age", "position", "groupId", "isGuest", "isActive", "phoneOrange", "phoneTelecel", "email"],
    builtIn: true,
  },
];

function cleanPreset(value: unknown, validKeys: readonly string[]): ExportColumnPreset | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<ExportColumnPreset>;
  if (typeof candidate.id !== "string" || typeof candidate.name !== "string" || !Array.isArray(candidate.keys)) return null;
  const keys = Array.from(new Set(candidate.keys.filter((key): key is string => typeof key === "string" && validKeys.includes(key))));
  if (!candidate.name.trim() || keys.length === 0) return null;
  return { id: candidate.id, name: candidate.name.trim(), keys, builtIn: candidate.builtIn === true };
}

export function loadExportColumnPresets(validKeys: readonly string[]): ExportColumnPreset[] {
  const builtIns = DEFAULT_EXPORT_COLUMN_PRESETS
    .map((preset) => ({ ...preset, keys: preset.keys.filter((key) => validKeys.includes(key)) }))
    .filter((preset) => preset.keys.length > 0);
  if (typeof window === "undefined") return builtIns;
  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]") as unknown;
    if (!Array.isArray(stored)) return builtIns;
    const custom = stored
      .map((value) => cleanPreset(value, validKeys))
      .filter((preset): preset is ExportColumnPreset => preset !== null && !preset.builtIn);
    return [...builtIns, ...custom];
  } catch {
    return builtIns;
  }
}

export function saveExportColumnPresets(presets: ExportColumnPreset[]) {
  if (typeof window === "undefined") return;
  const custom = presets.filter((preset) => !preset.builtIn).map((preset) => ({ id: preset.id, name: preset.name, keys: preset.keys }));
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(custom));
}

export function createExportColumnPresetId() {
  return `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
