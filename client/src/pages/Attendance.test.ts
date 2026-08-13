import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const attendanceSource = readFileSync(
  resolve(import.meta.dirname, "Attendance.tsx"),
  "utf8",
);

describe("attendance member autocomplete regression guards", () => {
  it("keeps the search connected to the shared ID/name matcher", () => {
    expect(attendanceSource).toContain('import { matchesMemberSearch } from "@shared/memberSearch"');
    expect(attendanceSource).toContain("matchesMemberSearch(member, memberSearch)");
    expect(attendanceSource).toContain("const memberSuggestions = filteredMembers.slice(0, 8)");
  });

  it("exposes an accessible combobox with keyboard selection", () => {
    expect(attendanceSource).toContain('role="combobox"');
    expect(attendanceSource).toContain('aria-autocomplete="list"');
    expect(attendanceSource).toContain('role="listbox"');
    expect(attendanceSource).toContain('role="option"');
    expect(attendanceSource).toContain('event.key === "ArrowDown"');
    expect(attendanceSource).toContain('event.key === "ArrowUp"');
    expect(attendanceSource).toContain('event.key === "Enter"');
    expect(attendanceSource).toContain("ID {member.id}");
  });

  it("fills the search field with the selected main-member name", () => {
    expect(attendanceSource).toContain("const handleMemberSuggestionSelect");
    expect(attendanceSource).toContain("setMemberSearch(member.name)");
    expect(attendanceSource).toContain("onClick={() => handleMemberSuggestionSelect(member)}");
    expect(attendanceSource).toContain("memberId: parseInt(memberId)");
  });
});
