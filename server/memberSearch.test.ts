import { describe, expect, it } from "vitest";
import { filterMembers, matchesMemberSearch, normalizeMemberSearch } from "../shared/memberSearch";

describe("member search", () => {
  const members = [
    { id: 1, name: "Ana Silva" },
    { id: 12, name: "Bruno Costa" },
    { id: 24, name: "Carlos Manuel" },
  ];

  it("aceita o ID principal exacto e trechos numéricos", () => {
    expect(normalizeMemberSearch(" 12 ")).toEqual({ normalized: "12", numericId: 12 });
    expect(matchesMemberSearch(members[1], "12")).toBe(true);
    expect(matchesMemberSearch(members[0], "12")).toBe(false);
    expect(matchesMemberSearch(members[2], "2")).toBe(true);
  });

  it("aceita o nome sem distinguir maiúsculas, minúsculas ou acentos de locale", () => {
    expect(matchesMemberSearch(members[0], "ana")).toBe(true);
    expect(matchesMemberSearch(members[2], "MANUEL")).toBe(true);
    expect(matchesMemberSearch(members[1], "inexistente")).toBe(false);
  });

  it("devolve todos os membros quando a pesquisa está vazia", () => {
    expect(members.filter((member) => matchesMemberSearch(member, " "))).toHaveLength(3);
  });

  it("combina pesquisa por nome/ID com cargo, sexo, estado, grupo e tipo", () => {
    const detailedMembers = [
      { id: 1, name: "Ana Silva", position: "Membro", sex: "F" as const, isActive: true, groupId: 1, isGuest: false },
      { id: 12, name: "Bruno Costa", position: "Oficial", sex: "M" as const, isActive: false, groupId: 2, isGuest: false },
      { id: 24, name: "Carla Manuel", position: "Convidado", sex: "F" as const, isActive: true, groupId: 5, isGuest: true },
    ];

    expect(filterMembers(detailedMembers, { query: "carla", sex: "F", status: "active", guest: "guests", groupId: 5 })).toEqual([detailedMembers[2]]);
    expect(filterMembers(detailedMembers, { query: "12", status: "inactive" })).toEqual([detailedMembers[1]]);
    expect(filterMembers(detailedMembers, { position: "Membro", guest: "members" })).toEqual([detailedMembers[0]]);
  });

  it("não altera a lista quando todos os filtros estão limpos", () => {
    const detailedMembers = members.map((member) => ({ ...member, isActive: true, isGuest: false }));
    expect(filterMembers(detailedMembers, { query: "", position: "all", sex: "all", status: "all", guest: "all", groupId: "all" })).toEqual(detailedMembers);
  });
});
