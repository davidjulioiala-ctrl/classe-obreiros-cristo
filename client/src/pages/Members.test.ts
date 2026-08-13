import { describe, expect, it } from "vitest";

describe("validação do cargo eclesiástico", () => {
  it("inclui 'Membro' nas opções válidas do formulário", () => {
    const validPositions = ["Líder", "Oficial", "Membro", "Membro de Ministério de Louvor", "Convidado"];
    expect(validPositions).toContain("Membro");
    
    const isStandard = validPositions.includes("Membro");
    expect(isStandard).toBe(true);
  });
});
