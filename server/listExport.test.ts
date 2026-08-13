import { describe, expect, it } from "vitest";
import { generateCsv, generateMembersCsv, generateMembersPdf, generateReportsCsv, generateReportsPdf } from "./listExport";

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

  it("generates PDF buffers for both lists", async () => {
    const membersPdf = await generateMembersPdf([]);
    const reportsPdf = await generateReportsPdf([]);

    expect(membersPdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(reportsPdf.subarray(0, 5).toString()).toBe("%PDF-");
  });
});
