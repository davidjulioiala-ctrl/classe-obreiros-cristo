export type SearchableMember = {
  id: number;
  name: string;
};

export function normalizeMemberSearch(query: string) {
  const normalized = query.trim().toLocaleLowerCase("pt-PT");
  const numericId = /^\d+$/.test(normalized) ? Number(normalized) : null;
  return { normalized, numericId };
}

export interface GroupSearchableMember extends SearchableMember {
  groupId?: number | null;
  isGuest?: boolean | null;
}

export interface FilterableMember extends GroupSearchableMember {
  position?: string | null;
  sex?: "M" | "F" | null;
  isActive?: boolean | null;
}

export function matchesMemberSearch(member: GroupSearchableMember, query: string) {
  const trimmed = query.trim();
  if (!trimmed) return true;
  if (trimmed.startsWith("group:")) {
    const groupId = Number(trimmed.split(":")[1]);
    return !Number.isNaN(groupId) && member.groupId === groupId;
  }
  if (trimmed === "guest:true") {
    return Boolean(member.isGuest);
  }
  const { normalized, numericId } = normalizeMemberSearch(trimmed);
  if (!normalized) return true;
  return String(member.id).includes(normalized) || member.name.toLocaleLowerCase("pt-PT").includes(normalized) || (numericId !== null && member.id === numericId);
}

export type MemberListFilters = {
  query?: string;
  position?: string;
  sex?: "all" | "M" | "F";
  status?: "all" | "active" | "inactive";
  guest?: "all" | "members" | "guests";
  groupId?: number | "all";
};

export function filterMembers<T extends FilterableMember>(members: T[], filters: MemberListFilters) {
  return members.filter((member) => {
    const matchesText = !filters.query?.trim() || matchesMemberSearch(member, filters.query);
    const matchesPosition = !filters.position || filters.position === "all" || member.position === filters.position;
    const matchesSex = !filters.sex || filters.sex === "all" || member.sex === filters.sex;
    const matchesStatus = !filters.status || filters.status === "all" || (filters.status === "active" ? member.isActive : !member.isActive);
    const matchesGuest = !filters.guest || filters.guest === "all" || (filters.guest === "guests" ? Boolean(member.isGuest) : !member.isGuest);
    const matchesGroup = filters.groupId === undefined || filters.groupId === "all" || member.groupId === filters.groupId;
    return matchesText && matchesPosition && matchesSex && matchesStatus && matchesGuest && matchesGroup;
  });
}
