import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { createMemberImportTemplate, createRejectedMembersCsv, createRejectedMembersExcel, normaliseMemberImportHeader, parseMemberImportFile, revalidateMemberImportRows, type MemberImportRow } from "./memberImport";

describe("memberImport", () => {
  it("normaliza cabeçalhos portugueses e acentuados", () => {
    expect(normaliseMemberImportHeader("Cargo Eclesiástico")).toBe("cargoeclesiastico");
    expect(normaliseMemberImportHeader("Data de nascimento (AAAA-MM-DD)")).toBe("datadenascimentoaaaammdd");
  });

  it("lê CSV, resolve grupo e deteta duplicados no próprio ficheiro", async () => {
    const csv = [
      "Nome,Sexo (M/F),Email,Grupo,Convidado",
      "Ana Silva,F,ana@example.com,Grupo 1,não",
      "Ana Silva,M,outra@example.com,Grupo 2,não",
    ].join("\n");
    const result = await parseMemberImportFile(new File([csv], "membros.csv", { type: "text/csv" }), [{ id: 1, name: "Grupo 1" }, { id: 2, name: "Grupo 2" }], []);
    expect(result.total).toBe(2);
    expect(result.validRows).toHaveLength(1);
    expect(result.invalidRows[0]?.errors.join(" ")).toContain("Nome duplicado");
    expect(result.validRows[0]?.groupId).toBe(1);
    expect(result.validRows[0]?.isGuest).toBe(false);
  });

  it("lê um modelo Excel e assinala nome já existente", async () => {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([
      ["Nome", "Sexo (M/F)", "Data de nascimento (AAAA-MM-DD)", "Grupo"],
      ["Maria Costa", "F", "1990-05-20", "Grupo 1"],
    ]);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Membros");
    const bytes = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const result = await parseMemberImportFile(new File([bytes], "membros.xlsx"), [{ id: 1, name: "Grupo 1" }], [{ id: 4, name: "Maria Costa", email: null }]);
    expect(result.validRows).toHaveLength(0);
    expect(result.invalidRows[0]?.errors.join(" ")).toContain("Nome já registado");
  });

  it("gera relatórios detalhados CSV e Excel das linhas rejeitadas", () => {
    const rejectedRows: MemberImportRow[] = [{ sourceRow: 7, name: "João; Costa", sex: "", email: "email-inválido", isGuest: false, errors: ["O sexo deve ser M/F.", "O email não é válido."] }];
    const csv = createRejectedMembersCsv(rejectedRows);
    expect(csv).toContain("Linha de origem;Nome");
    expect(csv).toContain("7;\"João; Costa\"");
    expect(csv).toContain("Motivos da rejeição");
    expect(csv).toContain("O sexo deve ser M/F.");

    const workbook = XLSX.read(createRejectedMembersExcel(rejectedRows), { type: "array" });
    expect(workbook.SheetNames).toEqual(["Linhas rejeitadas"]);
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets["Linhas rejeitadas"]);
    expect(rows[0]?.["Linha de origem"]).toBe(7);
    expect(rows[0]?.["Motivos da rejeição"]).toContain("O email não é válido.");
  });

  it("revalida uma linha editada e promove-a para válida", () => {
    const result = revalidateMemberImportRows([{ sourceRow: 2, name: "", sex: "", email: "invalido", isGuest: false, errors: ["erro antigo"] }], [{ id: 1, name: "Grupo 1" }], []);
    expect(result.invalidRows).toHaveLength(1);

    const corrected = revalidateMemberImportRows([{ sourceRow: 2, name: "Ana Silva", sex: "F", email: "ana@example.com", isGuest: false, groupName: "Grupo 1", errors: [] }], [{ id: 1, name: "Grupo 1" }], []);
    expect(corrected.invalidRows).toHaveLength(0);
    expect(corrected.validRows[0]?.groupId).toBe(1);
    expect(corrected.validRows[0]?.errors).toEqual([]);
  });

  it("gera um modelo Excel descarregável", () => {
    const bytes = createMemberImportTemplate();
    const workbook = XLSX.read(bytes, { type: "array" });
    expect(workbook.SheetNames).toEqual(["Membros"]);
    expect(XLSX.utils.sheet_to_json(workbook.Sheets.Membros, { header: 1 })[0]).toContain("Nome");
  });
});
