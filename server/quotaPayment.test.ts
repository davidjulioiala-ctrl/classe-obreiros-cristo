import { describe, expect, it } from "vitest";
import { calculateQuotaPaymentPlan } from "./db";

describe("distribuição automática de pagamentos de quotas", () => {
  it("distribui um valor completo por vários meses a partir do último mês pago", () => {
    const plan = calculateQuotaPaymentPlan(
      7,
      "250",
      100,
      [{ month: 1, year: 2026, amount: "100.00", isPaid: true }],
      { month: 2, year: 2026 },
    );

    expect(plan.startPeriod).toEqual({ month: 2, year: 2026 });
    expect(plan.allocations.map(({ month, year, amount, resultingPaid }) => ({ month, year, amount, resultingPaid }))).toEqual([
      { month: 2, year: 2026, amount: "100.00", resultingPaid: true },
      { month: 3, year: 2026, amount: "100.00", resultingPaid: true },
      { month: 4, year: 2026, amount: "50.00", resultingPaid: false },
    ]);
    expect(plan.remainingAmount).toBe("0.00");
  });

  it("completa um mês parcial antes de abrir o mês seguinte", () => {
    const plan = calculateQuotaPaymentPlan(
      9,
      "160",
      100,
      [
        { month: 1, year: 2026, amount: "100.00", isPaid: true },
        { month: 2, year: 2026, amount: "40.00", isPaid: false },
      ],
      { month: 3, year: 2026 },
    );

    expect(plan.allocations).toEqual([
      { month: 2, year: 2026, amount: "60.00", previousAmount: "40.00", resultingPaid: true, action: "completado" },
      { month: 3, year: 2026, amount: "100.00", previousAmount: "0.00", resultingPaid: true, action: "novo" },
    ]);
  });

  it("regista pagamento parcial no período actual quando ainda não existe histórico", () => {
    const plan = calculateQuotaPaymentPlan(12, "35,50", 100, [], { month: 5, year: 2026 });

    expect(plan.lastPaidPeriod).toBeNull();
    expect(plan.allocations).toEqual([
      { month: 5, year: 2026, amount: "35.50", previousAmount: "0.00", resultingPaid: false, action: "parcial" },
    ]);
    expect(plan.remainingAmount).toBe("0.00");
  });
});
