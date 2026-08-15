import { Toaster } from "@/components/ui/sonner";
import { useEffect } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import Dashboard from "@/pages/Dashboard";
import Members from "@/pages/Members";
import Activities from "@/pages/Activities";
import Finances from "@/pages/Finances";
import Attendance from "@/pages/Attendance";
import Transfers from "@/pages/Transfers";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";
import LocalLogin from "@/pages/LocalLogin";
import UserManagement from "@/pages/UserManagement";
import Louvor from "@/pages/Louvor";
import Profile from "@/pages/Profile";
import AuditAndBackup from "@/pages/AuditAndBackup";
import MemberHistoryPage from "@/pages/MemberHistory";
import IncompleteMembers from "@/pages/IncompleteMembers";
import Materials from "@/pages/Materials";
import SystemStatus from "@/pages/SystemStatus";
import SessionInactivityGuard from "./components/SessionInactivityGuard";
import MaintenanceGate from "./components/MaintenanceGate";
import { Route, Switch, useLocation } from "wouter";
import { isAccentColor, ThemeProvider, useTheme } from "./contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import { LocalAuthProvider, useLocalAuth } from "@/_core/hooks/useLocalAuth";
import { Loader2 } from "lucide-react";

function Router() {
  const [location] = useLocation();
  const { user, loading, logout } = useLocalAuth();
  const { setTheme, setAccentColor } = useTheme();
  const appearanceQuery = trpc.settings.get.useQuery({ keyName: "appearance" }, {
    enabled: Boolean(user),
    retry: false,
  });
  const organizationQuery = trpc.settings.getPublicOrganization.useQuery(undefined, { retry: false });

  useEffect(() => {
    if (organizationQuery.data?.organizationName && typeof document !== "undefined") {
      document.title = `${organizationQuery.data.organizationName} - Sistema de Gestão`;
    }
  }, [organizationQuery.data?.organizationName]);

  useEffect(() => {
    if (!appearanceQuery.data) return;
    try {
      const parsed = JSON.parse(appearanceQuery.data);
      if (parsed.theme === "light" || parsed.theme === "dark") setTheme(parsed.theme);
      if (isAccentColor(parsed.accent)) setAccentColor(parsed.accent);
    } catch {
      // Preferir a preferência local se a configuração remota estiver corrompida.
    }
  }, [appearanceQuery.data, setAccentColor, setTheme]);

  // O estado deve continuar acessível sem sessão e durante manutenção.
  if (location === "/status") {
    return <SystemStatus />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">A carregar...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Switch>
        <Route path={"/"} component={LocalLogin} />
        <Route path={"/404"} component={NotFound} />
        <Route component={LocalLogin} />
      </Switch>
    );
  }

  return (
    <MaintenanceGate user={user}>
      <SessionInactivityGuard user={user} logout={logout} />
      <Switch>
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/members/incomplete"} component={IncompleteMembers} />
      <Route path={"/members"} component={Members} />
      <Route path={"/activities"} component={Activities} />
      <Route path={"/attendance"} component={Attendance} />
      <Route path={"/finances"} component={Finances} />
      <Route path={"/transfers"} component={Transfers} />
      <Route path={"/history"} component={MemberHistoryPage} />
      <Route path={"/reports"} component={Reports} />
      <Route path={"/materials"} component={Materials} />
      <Route path={"/louvor"} component={Louvor} />
      <Route path={"/settings"} component={Settings} />
      <Route path={"/profile"} component={Profile} />
      <Route path={"/users"} component={UserManagement} />
      <Route path={"/audit-backup"} component={AuditAndBackup} />
      <Route path={"/login"} component={LocalLogin} />
      <Route path={"/404"} component={NotFound} />
      <Route path={"/"} component={Dashboard} />
      <Route component={NotFound} />
      </Switch>
    </MaintenanceGate>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="light" switchable>
      <LocalAuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </LocalAuthProvider>
    </ThemeProvider>
  );
}

export default App;
