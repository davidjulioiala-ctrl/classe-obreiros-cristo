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
  options?: { threshold?: number; recentLimit?: number; startDate?: Date | string; endDate?: Date | string },
): MemberParticipationHighlights {
  const threshold = Math.min(100, Math.max(0, options?.threshold ?? 60));
  const recentLimit = Math.min(20, Math.max(1, options?.recentLimit ?? 7));
  const startTimestamp = options?.startDate === undefined ? undefined : toDateValue(options.startDate);
  const endTimestamp = options?.endDate === undefined ? undefined : toDateValue(options.endDate);
  const filteredActivities = activities.filter((activity) => {
    if (startTimestamp === undefined && endTimestamp === undefined) return true;
    const activityTimestamp = toDateValue(activity.date);
    if (!activityTimestamp) return false;
    return (startTimestamp === undefined || activityTimestamp >= startTimestamp)
      && (endTimestamp === undefined || activityTimestamp <= endTimestamp);
  });
  const activityMap = new Map(filteredActivities.map((activity) => [activity.id, activity]));
  const presentActivityIdsByMember = new Map<number, Set<number>>();

  for (const record of attendance) {
    if (!record.isPresent || !activityMap.has(record.activityId)) continue;
    const activityIds = presentActivityIdsByMember.get(record.memberId) ?? new Set<number>();
    activityIds.add(record.activityId);
    presentActivityIdsByMember.set(record.memberId, activityIds);
  }

  const totalActivities = filteredActivities.length;
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


export type ParticipationMemberSort = "percentage-desc" | "percentage-asc" | "name-asc" | "name-desc";

export type ParticipationMemberFilterOptions = {
  search?: string;
  groupId?: number | null;
  sex?: string | null;
  sortBy?: ParticipationMemberSort;
};

function normalizeSearchValue(value: string | number | null | undefined) {
  return String(value ?? "").trim().toLocaleLowerCase("pt-PT");
}

export function filterAndSortParticipationMembers(
  members: MemberParticipationSummary[],
  options: ParticipationMemberFilterOptions = {},
) {
  const search = normalizeSearchValue(options.search);
  const selectedSex = normalizeSearchValue(options.sex);
  const sortBy = options.sortBy ?? "percentage-desc";

  return members
    .filter((member) => {
      const matchesSearch = !search || normalizeSearchValue(member.name).includes(search) || String(member.id).includes(search);
      const matchesGroup = options.groupId === undefined || options.groupId === null || member.groupId === options.groupId;
      const matchesSex = !selectedSex || selectedSex === "todos" || selectedSex === "all" || normalizeSearchValue(member.sex) === selectedSex;
      return matchesSearch && matchesGroup && matchesSex;
    })
    .slice()
    .sort((left, right) => {
      if (sortBy === "name-asc" || sortBy === "name-desc") {
        const comparison = left.name.localeCompare(right.name, "pt-PT", { sensitivity: "base" });
        return (sortBy === "name-desc" ? -comparison : comparison) || left.id - right.id;
      }
      const comparison = left.attendancePercentage - right.attendancePercentage;
      return (sortBy === "percentage-asc" ? comparison : -comparison) || left.name.localeCompare(right.name, "pt-PT", { sensitivity: "base" }) || left.id - right.id;
    });
}
