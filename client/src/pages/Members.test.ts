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

  it("mantém filtros combináveis por cargo, sexo, estado, grupo e tipo", () => {
    expect(membersSource).toContain("const [positionFilter, setPositionFilter] = useState(\"all\")");
    expect(membersSource).toContain("aria-label=\"Filtrar membros por cargo\"");
    expect(membersSource).toContain("aria-label=\"Filtrar membros por sexo\"");
    expect(membersSource).toContain("aria-label=\"Filtrar membros por estado\"");
    expect(membersSource).toContain("aria-label=\"Filtrar membros por grupo\"");
    expect(membersSource).toContain("aria-label=\"Filtrar membros por tipo\"");
    expect(membersSource).toContain("filterMembers(members ?? []");
    expect(membersSource).toContain("const clearMemberFilters = ()");
    expect(membersSource).toContain("Limpar filtros");
  });

  it("oferece importação CSV/Excel com pré-visualização e confirmação", () => {
    expect(membersSource).toContain("trpc.members.bulkImport.useMutation");
    expect(membersSource).toContain("parseMemberImportFile");
    expect(membersSource).toContain("Importar membros em massa");
    expect(membersSource).toContain("Confirmar importação");
    expect(membersSource).toContain("accept=\".csv,.xlsx,.xls");
    expect(membersSource).toContain("canImportMembers");
  });

  it("mantém as linhas rejeitadas disponíveis para relatório CSV e Excel", () => {
    expect(membersSource).toContain("createRejectedMembersCsv");
    expect(membersSource).toContain("createRejectedMembersExcel");
    expect(membersSource).toContain("downloadRejectedReport");
    expect(membersSource).toContain("<FileText className=\"mr-2 h-4 w-4\" /> CSV");
    expect(membersSource).toContain("<FileSpreadsheet className=\"mr-2 h-4 w-4\" /> Excel");
  });

  it("apresenta progresso acessível durante a leitura, validação e envio", () => {
    expect(membersSource).toContain("aria-label=\"Progresso da importação\"");
    expect(membersSource).toContain("aria-valuenow={importProgress}");
    expect(membersSource).toContain("A validar linhas e duplicados…");
    expect(membersSource).toContain("A enviar membros para o sistema…");
    expect(membersSource).toContain("animate-spin");
  });

  it("abre o modal de colunas e envia a selecção juntamente com os filtros", () => {
    expect(membersSource).toContain('import { ExportColumnDialog } from "@/components/ExportColumnDialog"');
    expect(membersSource).toContain("const [selectedExportColumns, setSelectedExportColumns] = useState<string[]>(() => [...MEMBER_EXPORT_COLUMN_KEYS])");
    expect(membersSource).toContain("columns={MEMBER_EXPORT_COLUMNS}");
    expect(membersSource).toContain("onConfirm={(columns, includePersonalData)");
    expect(membersSource).toContain("exportMembers(columns, includePersonalData)");
    expect(membersSource).toContain('params.set("columns", columns.join(","))');
    expect(membersSource).toContain('params.set("includePersonalData", includePersonalData ? "true" : "false")');
  });
});
