import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const activitiesSource = readFileSync(fileURLToPath(new URL("./Activities.tsx", import.meta.url)), "utf8");

describe("fluxos de actividades", () => {
  it("permite seleccionar membros e valida cargo na comissão", () => {
    expect(activitiesSource).toContain("membersQuery.data");
    expect(activitiesSource).toContain("Seleccione uma pessoa e indique o cargo de cada membro da comissão.");
    expect(activitiesSource).toContain("Adicione pelo menos uma pessoa à comissão ou desactive a opção de comissão.");
  });

  it("usa descarga autenticada e mantém as acções de PDF para documentos", () => {
    expect(activitiesSource).toContain("downloadProtectedFile");
    expect(activitiesSource).toContain("/api/activity-documents/${document.id}/download");
    expect(activitiesSource).toContain("Imprimir documento");
    expect(activitiesSource).toContain("Pré-visualização PDF autenticada");
  });
});
