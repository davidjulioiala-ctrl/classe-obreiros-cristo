import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { filterQuotaExportItems, generateQuotasCsv, generateQuotasExcel, generateQuotasPdf, type ExportQuotaItem } from "./quotaExport";

describe("quota exports", () => {
  const sampleItems: ExportQuotaItem[] = [
    {
      id: 1,
      memberId: 1,
      memberName: "David Júlio",
      year: 2026,
      month: 1,
      amount: "5000.00",
      isPaid: true,
      responsibleName: "Admin",
    },
    {
      id: 2,
      memberId: 2,
      memberName: "Emanuel Djú",
      year: 2026,
      month: 2,
      amount: "5000.00",
      isPaid: true,
      responsibleName: "Secretário",
    },
  ];

  it("generates CSV with exact columns ID, Nome, Ano, Mês pagos, Valor, Responsável", () => {
    const csv = generateQuotasCsv(sampleItems, true);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain("ID;Nome;Ano;Mês pagos;Valor;Responsável");
    expect(csv).toContain("=== MÊS: JANEIRO ===");
    expect(csv).toContain("David Júlio;2026;Janeiro");
    expect(csv).toContain("Admin");
  });

  it("respects personal data privacy by masking member name and responsible", () => {
    const csv = generateQuotasCsv(sampleItems, false);
    expect(csv).toContain("Membro Protegido");
    expect(csv).not.toContain("David Júlio");
    expect(csv).toContain("—");
    expect(csv).not.toContain("Admin");
  });

  it("filters export items by year, month, member, group and name/ID query", () => {
    const items: ExportQuotaItem[] = [
      { ...sampleItems[0], groupId: 1 },
      { ...sampleItems[1], groupId: 2 },
      { id: 3, memberId: 3, memberName: "Maria do Grupo Um", groupId: 1, year: 2025, month: 1, amount: "5000.00", isPaid: true, responsibleName: "Admin" },
      { id: 4, memberId: 4, memberName: "Pessoa Pendente", groupId: 1, year: 2026, month: 1, amount: "5000.00", isPaid: false, responsibleName: "Admin" },
    ];
    expect(filterQuotaExportItems(items, { year: 2026, month: 1, groupId: 1 }).map((item) => item.id)).toEqual([1]);
    expect(filterQuotaExportItems(items, { year: 2026, memberId: 2 }).map((item) => item.id)).toEqual([2]);
    expect(filterQuotaExportItems(items, { year: 2026, memberQuery: "maria" })).toEqual([]);
    expect(filterQuotaExportItems(items, { year: 2025, memberQuery: "3" }).map((item) => item.id)).toEqual([3]);
  });

  it("generates Excel workbook with 12 sheets (one per month)", () => {
    const buffer = generateQuotasExcel(sampleItems, true);
    expect(buffer.subarray(0, 2).toString()).toBe("PK");
    const workbook = XLSX.read(buffer, { type: "buffer" });
    expect(workbook.SheetNames.length).toBe(12);
    expect(workbook.SheetNames).toContain("Janeiro");
    expect(workbook.SheetNames).toContain("Dezembro");

    const janSheet = workbook.Sheets["Janeiro"];
    const rows = XLSX.utils.sheet_to_json(janSheet, { header: 1, raw: false }) as unknown[][];
    expect(rows[0]).toEqual(["ID", "Nome", "Ano", "Mês pagos", "Valor", "Responsável"]);
    expect(rows[1][0]).toBe("1");
    expect(rows[1][1]).toBe("David Júlio");
    expect(rows[1][2]).toBe("2026");
    expect(rows[1][3]).toBe("Janeiro");
    expect(String(rows[1][4])).toContain("5");
    expect(String(rows[1][4])).toContain("AOA");
    expect(rows[1][5]).toBe("Admin");
  });

  it("generates A4 landscape PDF with 12 monthly sections", async () => {
    const pdfBuffer = await generateQuotasPdf(sampleItems, true);
    const pdfText = pdfBuffer.toString("latin1");
    expect(pdfBuffer.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdfText).toContain("841.89"); // Landscape width
    expect(pdfText).toContain("595.28"); // Landscape height
    expect(pdfBuffer.length).toBeGreaterThan(1500);
  });
});
