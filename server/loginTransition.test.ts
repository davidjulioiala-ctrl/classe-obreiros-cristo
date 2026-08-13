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
});
