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
    expect(attendanceSource).toContain("memberId: Number(memberId)");
  });

  it("waits for every save before refreshing and keeps a visible saving state", () => {
    expect(attendanceSource).toContain("await recordAttendanceMutation.mutateAsync");
    expect(attendanceSource).toContain("await refetchAttendance()");
    expect(attendanceSource).toContain("const [isSavingAttendance, setIsSavingAttendance] = useState(false)");
    expect(attendanceSource).toContain("disabled={isSavingAttendance || recordAttendanceMutation.isPending}");
  });
});


describe("attendance export and shortcut regression guards", () => {
  it("supports activity date filter and specific member check in attendance", () => {
    expect(attendanceSource).toContain("activityDateFilter");
    expect(attendanceSource).toContain("specificMemberCheck");
  });

  it("exposes the authenticated PDF export for the selected activity", () => {
    expect(attendanceSource).toContain("/api/attendance/${selectedActivity}/pdf");
    expect(attendanceSource).toContain("Exportar PDF");
  });
});


describe("attendance activity selection stability", () => {
  it("keeps the attendance query mounted and toggles it with enabled", () => {
    expect(attendanceSource).toContain("const attendanceQuery = trpc.activities.getAttendance.useQuery(");
    expect(attendanceSource).toContain("{ activityId: selectedActivity ?? 1 }");
    expect(attendanceSource).toContain("{ enabled: selectedActivity !== null }");
    expect(attendanceSource).not.toContain("selectedActivity\n    ? trpc.activities.getAttendance.useQuery");
  });
});
