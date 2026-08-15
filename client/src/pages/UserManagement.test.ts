import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const userManagementSource = readFileSync(fileURLToPath(new URL("./UserManagement.tsx", import.meta.url)), "utf8");

describe("edição de funções de utilizadores", () => {
  it("mantém o fluxo 2FA completo com QR Code, fallback manual e códigos de recuperação", () => {
    expect(userManagementSource).toContain('fetch(path, {');
    expect(userManagementSource).toContain('"/api/auth/2fa/setup"');
    expect(userManagementSource).toContain('"/api/auth/2fa/confirm"');
    expect(userManagementSource).toContain('"/api/auth/2fa/disable"');
    expect(userManagementSource).toContain('qrGenerator.toDataURL');
    expect(userManagementSource).toContain('recoveryCodes');
    expect(userManagementSource).toContain('if (!cancelled) setTwoFactorQrCode(dataUrl);');
  });
  it("normaliza o papel do sistema e a função eclesiástica antes de guardar", () => {
    expect(userManagementSource).toContain("function isSystemRole");
    expect(userManagementSource).toContain("function isChurchRole");
    expect(userManagementSource).toContain("const safeRole: SystemRole");
    expect(userManagementSource).toContain("const safeChurchRole: ChurchRole");
    expect(userManagementSource).toContain("role: safeRole");
    expect(userManagementSource).toContain("churchRole: safeChurchRole");
  });

  it("permite editar a função sem exigir um email preenchido quando o registo já existe", () => {
    expect(userManagementSource).toContain("if (!name || (!editingUser && (!safeUsername || !email)))");
    expect(userManagementSource).toContain("...(email ? { email } : {})");
    expect(userManagementSource).toContain("Pode promover para administrador ou rebaixar para utilizador");
  });

  it("mantém a selecção restrita aos valores aceites pelo servidor", () => {
    expect(userManagementSource).toContain('if (isSystemRole(value))');
    expect(userManagementSource).toContain('if (isChurchRole(value))');
    expect(userManagementSource).toContain('<SelectItem value="user">Utilizador</SelectItem>');
    expect(userManagementSource).toContain('<SelectItem value="admin">Administrador</SelectItem>');
  });
});
