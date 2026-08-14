import { describe, expect, it } from "vitest";
import { completeParticipationByActivityType, normalizeParticipationByActivityType } from "./db";
import { parseHeaderText } from "../shared/headerFormatting";

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

  it("inclui todos os tipos base mesmo quando não existem actividades ou presenças", () => {
    const result = completeParticipationByActivityType([{ type: "culto", activityCount: 2, presentCount: 4, recordedCount: 4 }]);
    expect(result.map((entry) => entry.type)).toEqual(["Culto", "Estudo bíblico", "Reunião", "Louvor", "Social", "Outros"]);
    expect(result.find((entry) => entry.type === "Social")).toMatchObject({ activityCount: 0, presentCount: 0, recordedCount: 0 });
  });

  it("preserva estilos combinados e múltiplas linhas no cabeçalho", () => {
    expect(parseHeaderText("[b][i]Culto[/i][/b]\n[u]Data[/u]")).toEqual([
      [{ text: "Culto", bold: true, italic: true, underline: false }],
      [{ text: "Data", bold: false, italic: false, underline: true }],
    ]);
  });
});
