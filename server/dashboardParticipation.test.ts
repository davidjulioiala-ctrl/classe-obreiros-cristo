import { describe, expect, it } from "vitest";
import { normalizeParticipationByActivityType } from "./db";

describe("participação por tipo de actividade", () => {
  it("normaliza tipos vazios e valores numéricos vindos do MySQL", () => {
    expect(
      normalizeParticipationByActivityType([
        { type: "  Culto  ", activityCount: "3", presentCount: "24", recordedCount: "30" },
        { type: null, activityCount: 1, presentCount: 0, recordedCount: 1 },
      ]),
    ).toEqual([
      { type: "Culto", activityCount: 3, presentCount: 24, recordedCount: 30 },
      { type: "Sem tipo", activityCount: 1, presentCount: 0, recordedCount: 1 },
    ]);
  });

  it("impede valores negativos ou inválidos de contaminarem os gráficos", () => {
    expect(
      normalizeParticipationByActivityType([
        { type: "Reunião", activityCount: -2, presentCount: "-4", recordedCount: Number.NaN },
      ]),
    ).toEqual([{ type: "Reunião", activityCount: 0, presentCount: 0, recordedCount: 0 }]);
  });
});
