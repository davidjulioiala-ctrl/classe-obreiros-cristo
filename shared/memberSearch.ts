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
