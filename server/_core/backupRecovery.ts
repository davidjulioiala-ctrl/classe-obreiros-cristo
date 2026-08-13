const SECURITY_SETTING_KEYS = new Set(["system_maintenance", "global_session_revoked_at"]);

export function filterRestorableSettings<T extends { keyName?: string | null }>(settings: T[]) {
  return settings.filter((setting) => !SECURITY_SETTING_KEYS.has(setting.keyName ?? ""));
}

export function isSecuritySetting(keyName: string | null | undefined) {
  return SECURITY_SETTING_KEYS.has(keyName ?? "");
}
