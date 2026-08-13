import { describe, expect, it } from "vitest";
import { filterRestorableSettings, isSecuritySetting } from "./_core/backupRecovery";

describe("recuperação segura de backups", () => {
  it("preserva as definições de contenção fora do payload restaurável", () => {
    const settings = [
      { keyName: "theme", value: "dark" },
      { keyName: "system_maintenance", value: "false" },
      { keyName: "global_session_revoked_at", value: "2026-08-13T10:00:00.000Z" },
    ];
    expect(filterRestorableSettings(settings)).toEqual([{ keyName: "theme", value: "dark" }]);
    expect(isSecuritySetting("system_maintenance")).toBe(true);
    expect(isSecuritySetting("global_session_revoked_at")).toBe(true);
    expect(isSecuritySetting("theme")).toBe(false);
  });
});
