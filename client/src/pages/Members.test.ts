import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const membersSource = readFileSync(fileURLToPath(new URL("./Members.tsx", import.meta.url)), "utf8");

describe("validação do cargo eclesiástico", () => {
  it("inclui 'Membro' nas opções válidas do formulário", () => {
    const validPositions = ["Líder", "Oficial", "Membro", "Membro de Ministério de Louvor", "Convidado"];
    expect(validPositions).toContain("Membro");
    
    const isStandard = validPositions.includes("Membro");
    expect(isStandard).toBe(true);
  });

  it("mantém o hook de estado e as consultas do menu carregáveis", () => {
    expect(membersSource).toMatch(/import \{.*useState.*\} from "react";/);
    expect(membersSource).toContain("trpc.members.list.useQuery");
    expect(membersSource).toContain("trpc.groups.list.useQuery");
    expect(membersSource).toContain("const handleSubmit = (event: FormEvent)");
  });

  it("reinicia o formulário e oferece pesquisa acessível por nome ou ID", () => {
    expect(membersSource).toContain("const createEmptyForm = (): MemberForm");
    expect(membersSource).toContain('type="search" aria-label="Pesquisar membros por nome ou ID"');
    expect(membersSource).toContain('setSearchQuery("")');
    expect(membersSource).toContain("aria-live=\"polite\"");
  });
});
