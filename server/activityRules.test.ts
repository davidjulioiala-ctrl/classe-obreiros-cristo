import { describe, expect, it } from "vitest";
import { applyActivityTypeRules } from "../shared/activityRules";

describe("regras de tipo de actividade", () => {
  it("exige ordem do dia e motivo para reuniões", () => {
    expect(() => applyActivityTypeRules({ type: "reunião", isReligious: true })).toThrow("ordem do dia");
    expect(applyActivityTypeRules({ type: "Reunião", meetingAgenda: "A\nB", meetingReason: "Planeamento" })).toMatchObject({
      normalizedType: "reunião",
      isMeeting: true,
      isReligious: false,
      meetingAgenda: "A\nB",
      meetingReason: "Planeamento",
    });
  });

  it("remove a referência bíblica das actividades sociais", () => {
    expect(applyActivityTypeRules({ type: "social", isReligious: true, biblicalReference: "João 3:16" })).toMatchObject({
      normalizedType: "social",
      isSocial: true,
      isReligious: false,
      biblicalReference: undefined,
    });
    expect(applyActivityTypeRules({ type: "culto", isReligious: true, biblicalReference: " João 3:16 " }).biblicalReference).toBe("João 3:16");
  });

  it("não persiste campos exclusivos de reunião noutros tipos", () => {
    expect(applyActivityTypeRules({ type: "culto", meetingAgenda: "Não aplicável", meetingReason: "Não aplicável" })).toMatchObject({
      isMeeting: false,
      meetingAgenda: undefined,
      meetingReason: undefined,
    });
  });
});
