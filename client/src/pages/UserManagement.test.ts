import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const userManagementSource = readFileSync(fileURLToPath(new URL("./UserManagement.tsx", import.meta.url)), "utf8");

describe("edição de funções de utilizadores", () => {
  it("importa e renderiza o componente TwoFactorSettings", () => {
    expect(userManagementSource).toContain("TwoFactorSettings");
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
    expect(userManagementSource).toContain("if (!name || (!editingUser && !safeUsername))");
    expect(userManagementSource).toContain("...(email ? { email } : {})");
    expect(userManagementSource).toContain("Pode promover para administrador ou rebaixar para utilizador");
  });

  it("mantém a selecção restrita aos valores aceites pelo servidor", () => {
    expect(userManagementSource).toContain("isSystemRole");
    expect(userManagementSource).toContain("isChurchRole");
    expect(userManagementSource).toContain('<option value="user">Utilizador</option>');
    expect(userManagementSource).toContain('<option value="admin">Administrador</option>');
  });

  it("utiliza o componente reutilizável TwoFactorSettings", () => {
    expect(userManagementSource).toContain("TwoFactorSettings");
  });

  it("disponibiliza filtro para utilizadores com 2FA pendente", () => {
    expect(userManagementSource).toContain('const [twoFactorFilter, setTwoFactorFilter] = useState<"all" | "enabled" | "pending">("all")');
    expect(userManagementSource).toContain('twoFactorFilter === "pending"');
    expect(userManagementSource).toContain('u.twoFactorEnabled !== true');
    expect(userManagementSource).toContain('option value="pending">2FA pendente</option>');
  });

  it("restringe a gestão e a criação de utilizadores ao administrador", () => {
    expect(userManagementSource).toContain('const isAdmin = currentUser?.role === "admin"');
    expect(userManagementSource).toContain('if (currentUser && !isAdmin)');
    expect(userManagementSource).toContain('Apenas administradores podem criar ou editar utilizadores.');
    expect(userManagementSource).toContain('{isAdmin && (');
  });
});
