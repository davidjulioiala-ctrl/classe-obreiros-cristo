import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAdministrativeNotificationEmailMock, getAppSettingMock } = vi.hoisted(() => ({
  getAdministrativeNotificationEmailMock: vi.fn(),
  getAppSettingMock: vi.fn(),
}));

vi.mock("./db", () => ({
  getAdministrativeNotificationEmail: getAdministrativeNotificationEmailMock,
  getAppSetting: getAppSettingMock,
}));

import { notifyOwner } from "./_core/notification";

describe("notificações administrativas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAdministrativeNotificationEmailMock.mockResolvedValue("admin@example.org");
    getAppSettingMock.mockResolvedValue(JSON.stringify({ externalOwnerAlerts: false }));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, statusText: "OK" }));
  });

  it("não envia alertas externos quando a preferência está desactivada", async () => {
    await expect(notifyOwner({ title: "Alerta", content: "Operação concluída" })).resolves.toBe(false);

    expect(getAdministrativeNotificationEmailMock).not.toHaveBeenCalled();
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it("inclui o email administrativo quando o canal é activado explicitamente", async () => {
    getAppSettingMock.mockResolvedValue(JSON.stringify({ externalOwnerAlerts: true }));

    await expect(notifyOwner({ title: "Alerta", content: "Operação concluída" })).resolves.toBe(true);

    expect(getAdministrativeNotificationEmailMock).toHaveBeenCalledTimes(1);
    const fetchMock = vi.mocked(fetch);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(String(request.body)) as { title: string; content: string };
    expect(body.title).toBe("Alerta");
    expect(body.content).toContain("Destinatário Administrativo: admin@example.org");
    expect(body.content).toContain("Operação concluída");
  });
});
