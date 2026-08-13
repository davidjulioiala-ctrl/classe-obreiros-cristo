export type SearchableMember = {
  id: number;
  name: string;
};

export function normalizeMemberSearch(query: string) {
  const normalized = query.trim().toLocaleLowerCase("pt-PT");
  const numericId = /^\d+$/.test(normalized) ? Number(normalized) : null;
  return { normalized, numericId };
}

export function matchesMemberSearch(member: SearchableMember, query: string) {
  const { normalized, numericId } = normalizeMemberSearch(query);
  if (!normalized) return true;
  return String(member.id).includes(normalized) || member.name.toLocaleLowerCase("pt-PT").includes(normalized) || (numericId !== null && member.id === numericId);
}
