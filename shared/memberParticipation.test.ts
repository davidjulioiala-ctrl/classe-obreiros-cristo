import { describe, expect, it } from "vitest";
import { summarizeMemberParticipation } from "./memberParticipation";

describe("resumo de participação dos membros", () => {
  const members = [
    { id: 1, name: "Ana Silva", sex: "F", position: "Membro", groupId: 1, isGuest: false, isActive: true },
    { id: 2, name: "Bruno Costa", sex: "M", position: "Oficial", groupId: 1, isGuest: false, isActive: true },
  ];
  const activities = Array.from({ length: 8 }, (_, index) => ({
    id: index + 1,
    name: `Actividade ${index + 1}`,
    date: `2026-01-${String(index + 1).padStart(2, "0")}`,
    type: "Culto",
    status: "realizada",
  }));

  it("classifica 60% como activo e abaixo de 60% como inactivo", () => {
    const result = summarizeMemberParticipation(
      members,
      activities.slice(0, 5),
      [
        { memberId: 1, activityId: 1, isPresent: true },
        { memberId: 1, activityId: 2, isPresent: true },
        { memberId: 1, activityId: 3, isPresent: true },
        { memberId: 2, activityId: 1, isPresent: true },
        { memberId: 2, activityId: 2, isPresent: true },
      ],
      { threshold: 60 },
    );

    expect(result.active.map((member) => [member.id, member.attendancePercentage])).toEqual([[1, 60]]);
    expect(result.inactive.map((member) => [member.id, member.attendancePercentage])).toEqual([[2, 40]]);
  });

  it("não duplica uma actividade quando existem registos de presença repetidos", () => {
    const result = summarizeMemberParticipation(
      [members[0]],
      activities.slice(0, 2),
      [
        { memberId: 1, activityId: 1, isPresent: true },
        { memberId: 1, activityId: 1, isPresent: true },
      ],
    );

    expect(result.inactive).toHaveLength(1);
    expect(result.inactive[0].presentCount).toBe(1);
    expect(result.inactive[0].attendancePercentage).toBe(50);
    expect(result.inactive[0].lastActivities).toHaveLength(1);
  });

  it("limita o histórico às últimas sete actividades em ordem decrescente", () => {
    const result = summarizeMemberParticipation(
      [members[0]],
      activities,
      activities.map((activity) => ({ memberId: 1, activityId: activity.id, isPresent: true })),
      { recentLimit: 7 },
    );

    expect(result.active[0].lastActivities).toHaveLength(7);
    expect(result.active[0].lastActivities.map((activity) => activity.id)).toEqual([8, 7, 6, 5, 4, 3, 2]);
  });
});


  it("calcula a percentagem apenas para o intervalo temporal seleccionado", () => {
    const temporalMember = { id: 1, name: "Ana Silva", sex: "F", position: "Membro", groupId: 1, isGuest: false, isActive: true };
    const temporalActivities = Array.from({ length: 8 }, (_, index) => ({
      id: index + 1,
      name: `Actividade ${index + 1}`,
      date: `2026-01-${String(index + 1).padStart(2, "0")}`,
      type: "Culto",
      status: "realizada",
    }));
    const result = summarizeMemberParticipation(
      [temporalMember],
      temporalActivities,
      [
        { memberId: 1, activityId: 1, isPresent: true },
        { memberId: 1, activityId: 4, isPresent: true },
        { memberId: 1, activityId: 8, isPresent: false },
      ],
      { threshold: 50, startDate: "2026-01-02", endDate: "2026-01-05" },
    );

    expect(result.totalActivities).toBe(4);
    expect(result.active).toHaveLength(0);
    expect(result.inactive[0]).toMatchObject({ id: 1, presentCount: 1, attendancePercentage: 25 });
  });
