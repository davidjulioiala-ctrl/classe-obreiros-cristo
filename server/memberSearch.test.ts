import { describe, expect, it } from "vitest";
import { matchesMemberSearch, normalizeMemberSearch } from "../shared/memberSearch";

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
});
