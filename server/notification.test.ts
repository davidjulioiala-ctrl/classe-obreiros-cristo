import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAdministrativeNotificationEmailMock } = vi.hoisted(() => ({
  getAdministrativeNotificationEmailMock: vi.fn(),
}));

vi.mock("./db", () => ({
  getAdministrativeNotificationEmail: getAdministrativeNotificationEmailMock,
}));

import { notifyOwner } from "./_core/notification";

describe("notificações administrativas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAdministrativeNotificationEmailMock.mockResolvedValue("admin@example.org");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, statusText: "OK" }));
  });

  it("inclui o email administrativo configurado no destino da notificação", async () => {
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

  it("usa um marcador administrativo quando ainda não existe email configurado", async () => {
    getAdministrativeNotificationEmailMock.mockResolvedValue(null);

    await expect(notifyOwner({ title: "Alerta", content: "Sem email" })).resolves.toBe(true);

    const fetchMock = vi.mocked(fetch);
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(String(request.body)) as { content: string };
    expect(body.content).toContain("Destinatário Administrativo: Administrador do Sistema (Backup)");
  });
});
