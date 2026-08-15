import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");

function readProjectFile(relativePath: string) {
  return readFileSync(resolve(projectRoot, relativePath), "utf8");
}

describe("login transition regression guards", () => {
  it("uses the application ThemeProvider in Sonner instead of next-themes", () => {
    const source = readProjectFile("client/src/components/ui/sonner.tsx");

    expect(source).toContain('from "@/contexts/ThemeContext"');
    expect(source).not.toContain('from "next-themes"');
  });

  it("keeps a single global Toaster outside the authenticated layout", () => {
    const appSource = readProjectFile("client/src/App.tsx");
    const dashboardSource = readProjectFile("client/src/components/DashboardLayoutCustom.tsx");

    expect((appSource.match(/<Toaster\s*\/>/g) ?? []).length).toBe(1);
    expect(dashboardSource).not.toContain("<Toaster");
  });

  it("shares one authentication state between Router and LocalLogin", () => {
    const appSource = readProjectFile("client/src/App.tsx");
    const hookSource = readProjectFile("client/src/_core/hooks/useLocalAuth.ts");

    expect(appSource).toContain("<LocalAuthProvider>");
    expect(appSource).toContain("<Router />");
    expect(hookSource).toContain("createContext<LocalAuthContextValue | undefined>");
    expect(hookSource).toContain("useContext(LocalAuthContext)");
  });

  it("does not force a full document reload after local login or 2FA", () => {
    const loginSource = readProjectFile("client/src/pages/LocalLogin.tsx");

    expect(loginSource).not.toContain('window.location.assign("/dashboard")');
    expect(loginSource).toContain('navigate("/dashboard")');
  });

  it("keeps protected tRPC operations on the local cookie session", () => {
    const mainSource = readProjectFile("client/src/main.tsx");
    const headerSource = readProjectFile("client/src/lib/localTrpcHeaders.ts");
    const contextSource = readProjectFile("server/_core/context.ts");

    expect(mainSource).toContain("localTrpcHeaders");
    expect(headerSource).toContain("return {};");
    expect(headerSource).not.toMatch(/return \{[^}]*Authorization/s);
    expect(headerSource).not.toMatch(/return \{[^}]*sessionStorage/s);
    expect(contextSource).toContain("getLocalUserFromRequest");
    expect(contextSource).not.toContain('from "./sdk"');
  });

  it("keeps the shared dashboard layout on local authentication", () => {
    const layoutSource = readProjectFile("client/src/components/DashboardLayoutCustom.tsx");

    expect(layoutSource).toContain('from "@/_core/hooks/useLocalAuth"');
    expect(layoutSource).toContain("const { user, logout } = useLocalAuth();");
    expect(layoutSource).not.toContain('from "@/_core/hooks/useAuth"');
    expect(layoutSource).not.toContain("useAuth()");
  });

  it("keeps a global light/dark toggle in the authenticated header", () => {
    const layoutSource = readProjectFile("client/src/components/DashboardLayoutCustom.tsx");

    expect(layoutSource).toContain("const { theme, toggleTheme } = useTheme();");
    expect(layoutSource).toContain("onClick={toggleTheme}");
    expect(layoutSource).toContain("Mudar para modo escuro");
  });

  it("stabilizes theme callbacks so remote hydration does not revert a local selection", () => {
    const themeSource = readProjectFile("client/src/contexts/ThemeContext.tsx");

    expect(themeSource).toContain("useCallback");
    expect(themeSource).toContain("const setTheme = useCallback");
    expect(themeSource).toContain("const toggleTheme = useCallback");
  });

  it("does not register legacy OAuth routes in the server startup", () => {
    const serverSource = readProjectFile("server/_core/index.ts");

    expect(serverSource).toContain('registerLocalAuthRoutes(app)');
    expect(serverSource).not.toContain('registerOAuthRoutes');
    expect(serverSource).not.toContain('"./oauth"');
  });

  it("keeps public incident attachments visible to administrators", () => {
    const auditSource = readProjectFile("client/src/pages/AuditAndBackup.tsx");

    expect(auditSource).toContain("incident.attachmentUrl");
    expect(auditSource).toContain("Ver captura anexada");
    expect(auditSource).toContain('rel="noreferrer"');
  });

  it("makes administrator 2FA activation usable with QR and manual fallback", () => {
    const userManagementSource = readProjectFile("client/src/pages/UserManagement.tsx");

    expect(userManagementSource).toContain('from "qrcode"');
    expect(userManagementSource).toContain("toDataURL");
    expect(userManagementSource).toContain("qrGenerator");
    expect(userManagementSource).toContain("/api/auth/2fa/setup");
    expect(userManagementSource).toContain("/api/auth/2fa/confirm");
    expect(userManagementSource).toContain("código de 6 dígitos");
    expect(userManagementSource).toContain("códigos de recuperação");
  });
});
