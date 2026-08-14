import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { generateFinancialExcel, summarizeFinancialReport } from "./financialReport";

describe("financial reports", () => {
  const payload = {
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    quotas: [
      { memberId: 1, month: 1, year: 2026, amount: "100", isPaid: true },
      { memberId: 2, month: 1, year: 2026, amount: "100", isPaid: false },
    ],
    otherIncome: [{ description: "Oferta", amount: "250", date: "2026-02-01" }],
    expenses: [{ designation: "Material", quantity: 2, unitPrice: "50", totalPrice: "100", date: "2026-03-01" }],
  };

  it("calculates paid quotas plus other income minus expenses", () => {
    expect(summarizeFinancialReport(payload)).toMatchObject({
      quotaTotal: 100,
      incomeTotal: 250,
      expenseTotal: 100,
      balance: 250,
      quotaCount: 1,
      incomeCount: 1,
      expenseCount: 1,
    });
  });

  it("generates an XLSX buffer with the expected workbook signature", () => {
    const output = generateFinancialExcel(payload);
    expect(Buffer.isBuffer(output)).toBe(true);
    expect(output.subarray(0, 2).toString("hex")).toBe("504b");
  });

  it("omits the responsible column when personal data is disabled", () => {
    const output = generateFinancialExcel({
      ...payload,
      includePersonalData: false,
      otherIncome: [{ ...payload.otherIncome[0], responsible: "Pessoa confidencial" }],
    });
    const workbook = XLSX.read(output, { type: "buffer" });
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets["Outras receitas"]);
    expect(rows[0]).not.toHaveProperty("Responsável");
  });
});
