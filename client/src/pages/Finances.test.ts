import { describe, expect, it } from "vitest";
import { buildQuotaStatusCsv } from "./Finances";

describe("buildQuotaStatusCsv", () => {
  it("gera a lista de pessoas que não pagaram com ID, estado e período", () => {
    const csv = buildQuotaStatusCsv("unpaid", [
      { id: 7, name: "Ana Silva", isActive: true, status: "unpaid", amount: null, paidAt: null, lastPaidAt: "2026-01-10" },
    ]);

    expect(csv).toContain('"ID";"Nome";"Estado";"Valor pago";"Data de pagamento";"Último pagamento"');
    expect(csv).toContain('"7";"Ana Silva";"Não pagaram";"";"—";"2026-01-10"');
  });

  it("escapa aspas e identifica quem parou de pagar", () => {
    const csv = buildQuotaStatusCsv("stopped", [
      { id: 2, name: 'João "Jota"', isActive: false, status: "stopped", amount: 50, paidAt: null, lastPaidAt: "2025-12-05" },
    ]);

    expect(csv).toContain('"2";"João ""Jota""";"Pararam de pagar";"50";"—";"2025-12-05"');
  });
});
