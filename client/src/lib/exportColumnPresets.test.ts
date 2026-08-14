import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_EXPORT_COLUMN_PRESETS, createExportColumnPresetId, loadExportColumnPresets, saveExportColumnPresets } from "./exportColumnPresets";

function createStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

describe("exportColumnPresets", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("disponibiliza modelos predefinidos apenas com colunas válidas", () => {
    const presets = loadExportColumnPresets(["id", "name", "email"]);
    expect(presets.map((preset) => preset.name)).toEqual(["Resumo geral", "Dados de contacto", "Completo"]);
    expect(presets[0].keys).toEqual(["id", "name"]);
    expect(presets.every((preset) => preset.builtIn === true)).toBe(true);
  });

  it("guarda e carrega apenas modelos personalizados válidos", () => {
    vi.stubGlobal("window", { localStorage: createStorage() });
    const validKeys = ["id", "name", "email"];
    const presets = [...DEFAULT_EXPORT_COLUMN_PRESETS, { id: "custom-1", name: "Contactos", keys: ["name", "email"] }];
    saveExportColumnPresets(presets);
    const loaded = loadExportColumnPresets(validKeys);
    expect(loaded.some((preset) => preset.name === "Contactos" && preset.builtIn !== true)).toBe(true);
  });

  it("remove chaves inválidas e rejeita modelos sem nome ou colunas", () => {
    const storage = createStorage();
    storage.setItem("classe-obreiros-cristo.export-column-presets.v1", JSON.stringify([
      { id: "custom-ok", name: "Válido", keys: ["id", "unknown", "id"] },
      { id: "custom-empty", name: "Sem colunas", keys: ["unknown"] },
      { id: "custom-name", name: " ", keys: ["id"] },
    ]));
    vi.stubGlobal("window", { localStorage: storage });
    const loaded = loadExportColumnPresets(["id"]);
    expect(loaded.some((preset) => preset.name === "Válido" && preset.keys.length === 1)).toBe(true);
    expect(loaded.some((preset) => preset.id === "custom-empty")).toBe(false);
    expect(loaded.some((preset) => preset.id === "custom-name")).toBe(false);
  });

  it("gera identificadores distintos para modelos personalizados", () => {
    const first = createExportColumnPresetId();
    const second = createExportColumnPresetId();
    expect(first).toMatch(/^custom-/);
    expect(second).toMatch(/^custom-/);
    expect(first).not.toBe(second);
  });
});
