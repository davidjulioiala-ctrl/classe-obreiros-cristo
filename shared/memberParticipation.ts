export type ParticipationMemberInput = {
  id: number;
  name: string;
  sex?: string | null;
  position?: string | null;
  groupId?: number | null;
  isGuest: boolean;
  isActive: boolean;
};

export type ParticipationActivityInput = {
  id: number;
  name: string;
  date: Date | string;
  type?: string | null;
  status: string;
};

export type ParticipationAttendanceInput = {
  memberId: number;
  activityId: number;
  isPresent: boolean;
};

export type MemberParticipationActivity = ParticipationActivityInput;

export type MemberParticipationSummary = ParticipationMemberInput & {
  sex: string | null;
  position: string | null;
  groupId: number | null;
  attendancePercentage: number;
  presentCount: number;
  totalActivities: number;
  lastActivities: MemberParticipationActivity[];
};

export type MemberParticipationHighlights = {
  threshold: number;
  totalActivities: number;
  active: MemberParticipationSummary[];
  inactive: MemberParticipationSummary[];
};

function toDateValue(value: Date | string) {
  const timestamp = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function summarizeMemberParticipation(
  members: ParticipationMemberInput[],
  activities: ParticipationActivityInput[],
  attendance: ParticipationAttendanceInput[],
  options?: { threshold?: number; recentLimit?: number },
): MemberParticipationHighlights {
  const threshold = Math.min(100, Math.max(0, options?.threshold ?? 60));
  const recentLimit = Math.min(20, Math.max(1, options?.recentLimit ?? 7));
  const activityMap = new Map(activities.map((activity) => [activity.id, activity]));
  const presentActivityIdsByMember = new Map<number, Set<number>>();

  for (const record of attendance) {
    if (!record.isPresent || !activityMap.has(record.activityId)) continue;
    const activityIds = presentActivityIdsByMember.get(record.memberId) ?? new Set<number>();
    activityIds.add(record.activityId);
    presentActivityIdsByMember.set(record.memberId, activityIds);
  }

  const totalActivities = activities.length;
  const summaries = members.map((member) => {
    const presentActivityIds = presentActivityIdsByMember.get(member.id) ?? new Set<number>();
    const presentCount = presentActivityIds.size;
    const attendancePercentage = totalActivities > 0 ? Math.round((presentCount / totalActivities) * 100) : 0;
    const lastActivities = Array.from(presentActivityIds)
      .map((activityId) => activityMap.get(activityId))
      .filter((activity): activity is ParticipationActivityInput => Boolean(activity))
      .sort((left, right) => toDateValue(right.date) - toDateValue(left.date) || right.id - left.id)
      .slice(0, recentLimit);

    return {
      ...member,
      sex: member.sex ?? null,
      position: member.position ?? null,
      groupId: member.groupId ?? null,
      attendancePercentage,
      presentCount,
      totalActivities,
      lastActivities,
    } satisfies MemberParticipationSummary;
  });

  return {
    threshold,
    totalActivities,
    active: summaries.filter((member) => member.attendancePercentage >= threshold),
    inactive: summaries.filter((member) => member.attendancePercentage < threshold),
  };
}
