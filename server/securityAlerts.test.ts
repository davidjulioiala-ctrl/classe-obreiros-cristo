import { beforeEach, describe, expect, it, vi } from "vitest";

const { notifyOwnerMock, getAppSettingMock } = vi.hoisted(() => ({
  notifyOwnerMock: vi.fn(),
  getAppSettingMock: vi.fn(),
}));

vi.mock("./_core/notification", () => ({ notifyOwner: notifyOwnerMock }));
vi.mock("./db", () => ({ getAppSetting: getAppSettingMock }));

import { notifySecurityEvent } from "./_core/securityAlerts";

describe("security alerts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    notifyOwnerMock.mockResolvedValue(true);
    getAppSettingMock.mockResolvedValue(null);
  });

  it("não envia alertas ao proprietário por defeito", async () => {
    await expect(notifySecurityEvent({ kind: "sensitive_export", title: "Exportação", actorId: 4 })).resolves.toBe(false);
    expect(notifyOwnerMock).not.toHaveBeenCalled();
  });

  it("notifies without including secret values and deduplicates bursts quando activado explicitamente", async () => {
    getAppSettingMock.mockImplementation(async (key: string) => key === "notifications" ? JSON.stringify({ externalOwnerAlerts: true }) : null);
    await expect(notifySecurityEvent({
      kind: "two_factor_failure",
      title: "Falha 2FA",
      actorId: 4,
      metadata: { ip: "127.0.0.1\n<script>", code: "123456" },
    })).resolves.toBe(true);
    await expect(notifySecurityEvent({
      kind: "two_factor_failure",
      title: "Falha 2FA",
      actorId: 4,
      metadata: { ip: "127.0.0.1\n<script>", code: "123456" },
    })).resolves.toBe(false);

    expect(notifyOwnerMock).toHaveBeenCalledTimes(1);
    const payload = notifyOwnerMock.mock.calls[0][0] as { content: string };
    expect(payload.content).not.toContain("123456");
    expect(payload.content).not.toContain("<script>");
    expect(payload.content).toContain("127.0.0.1script");
  });
});
