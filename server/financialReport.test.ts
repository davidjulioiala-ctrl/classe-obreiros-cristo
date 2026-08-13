import { describe, expect, it } from "vitest";
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
});
