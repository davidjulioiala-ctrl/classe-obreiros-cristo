import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { generateCsv, generateMembersCsv, generateMembersExcel, generateMembersPdf, generateReportsCsv, generateReportsExcel, generateReportsPdf } from "./listExport";

describe("list exports", () => {
  it("generates UTF-8 CSV with semicolon delimiters and escaped values", () => {
    const csv = generateCsv(["ID", "Nome"], [[1, 'Ana; "Lopes"\n']]);

    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain("ID;Nome");
    expect(csv).toContain('1;"Ana; ""Lopes""\n"');
  });

  it("exports only the selected member columns in the requested order", () => {
    const csv = generateMembersCsv([{
      id: 1,
      name: "Ana Lopes",
      sex: "F",
      birthDate: "2000-01-02",
      position: "Membro",
      groupId: 3,
      isGuest: false,
      isActive: true,
      phoneOrange: null,
      phoneTelecel: "923000000",
      email: "ana@example.org",
    }], ["name", "id"]);

    expect(csv).toContain("Nome;ID");
    expect(csv).toContain("Ana Lopes;1");
    expect(csv).not.toContain("Email");
  });

  it("exports member IDs and relevant list fields to CSV", () => {
    const csv = generateMembersCsv([{
      id: 1,
      name: "Ana Lopes",
      sex: "F",
      birthDate: "2000-01-02",
      position: "Membro",
      groupId: 3,
      isGuest: false,
      isActive: true,
      phoneOrange: null,
      phoneTelecel: "923000000",
      email: "ana@example.org",
    }]);

    expect(csv).toContain("ID;Nome;Sexo");
    expect(csv).toContain("1;Ana Lopes;Feminino");
    expect(csv).toContain("Membro;3;Não;Ativo");
  });

  it("exports selected member columns to a readable XLSX workbook", () => {
    const workbookBuffer = generateMembersExcel([{
      id: 1,
      name: "Ana Lopes",
      sex: "F",
      birthDate: "2000-01-02",
      position: "Membro",
      groupId: 3,
      isGuest: false,
      isActive: true,
      phoneOrange: null,
      phoneTelecel: "923000000",
      email: "ana@example.org",
    }], ["name", "id"]);

    expect(workbookBuffer.subarray(0, 2).toString()).toBe("PK");
    const workbook = XLSX.read(workbookBuffer, { type: "buffer" });
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets.Membros, { header: 1, raw: false }) as unknown[][];
    expect(rows[0]).toEqual(["Nome", "ID"]);
    expect(rows[1]).toEqual(["Ana Lopes", "1"]);
  });

  it("exports report IDs, activity IDs and content to CSV", () => {
    const csv = generateReportsCsv([{
      id: 1,
      activityId: 4,
      type: "ata",
      content: "Reunião concluída",
      createdAt: "2026-08-13T10:00:00.000Z",
    }]);

    expect(csv).toContain("ID;Tipo;Actividade ID");
    expect(csv).toContain("1;Ata de actividade;4");
    expect(csv).toContain("Reunião concluída");
  });

  it("exports reports to a structured XLSX sheet with selected headers", () => {
    const output = generateReportsExcel([{
      id: 1,
      activityId: 4,
      type: "relatorio",
      content: "Conteúdo",
      createdAt: "2026-08-13T10:00:00.000Z",
    }], ["id", "type", "activityId"]);
    const workbook = XLSX.read(output, { type: "buffer" });
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets["Relatórios"], { header: 1, raw: false }) as unknown[][];
    expect(rows[0]).toEqual(["ID", "Tipo", "Actividade ID"]);
    expect(rows[1]).toEqual(["1", "Relatório", "4"]);
  });

  it("keeps one member per row and sorts the vertical list by ascending ID in CSV and XLSX", () => {
    const members = [
      { id: 3, name: "Carlos", sex: "M", birthDate: "1990-01-01", position: "Membro", groupId: 1, isGuest: false, isActive: true, phoneOrange: null, phoneTelecel: null, email: null },
      { id: 1, name: "Ana", sex: "F", birthDate: "1991-01-01", position: "Membro", groupId: 1, isGuest: false, isActive: true, phoneOrange: null, phoneTelecel: null, email: null },
      { id: 2, name: "Bruno", sex: "M", birthDate: "1992-01-01", position: "Membro", groupId: 1, isGuest: false, isActive: true, phoneOrange: null, phoneTelecel: null, email: null },
    ];
    const csvRows = generateMembersCsv(members, ["id", "name"]).split("\r\n").slice(1).filter(Boolean);
    expect(csvRows.map((row) => row.split(";")[0])).toEqual(["1", "2", "3"]);
    expect(csvRows.map((row) => row.split(";")[1])).toEqual(["Ana", "Bruno", "Carlos"]);

    const workbook = XLSX.read(generateMembersExcel(members, ["id", "name"]), { type: "buffer" });
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets.Membros, { header: 1, raw: false }) as unknown[][];
    expect(rows.slice(1)).toEqual([["1", "Ana"], ["2", "Bruno"], ["3", "Carlos"]]);
  });

  it("generates A4 landscape table PDFs for both lists", async () => {
    const membersPdf = await generateMembersPdf([]);
    const reportsPdf = await generateReportsPdf([]);
    const membersText = membersPdf.toString("latin1");
    const reportsText = reportsPdf.toString("latin1");

    expect(membersPdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(reportsPdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(membersText).toContain("841.89");
    expect(membersText).toContain("595.28");
    expect(reportsText).toContain("841.89");
    expect(reportsText).toContain("595.28");
    expect(membersPdf.length).toBeGreaterThan(1000);
    expect(reportsPdf.length).toBeGreaterThan(1000);
  });
});
