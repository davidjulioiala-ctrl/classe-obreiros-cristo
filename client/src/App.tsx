import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import Login from "@/pages/Login";
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
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2 } from "lucide-react";

function Router() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-emerald-500 mx-auto mb-4" />
          <p className="text-slate-600">A carregar...</p>
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
    <Switch>
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/members"} component={Members} />
      <Route path={"/activities"} component={Activities} />
      <Route path={"/attendance"} component={Attendance} />
      <Route path={"/finances"} component={Finances} />
      <Route path={"/transfers"} component={Transfers} />
      <Route path={"/reports"} component={Reports} />
      <Route path={"/louvor"} component={Louvor} />
      <Route path={"/settings"} component={Settings} />
      <Route path={"/profile"} component={Profile} />
      <Route path={"/users"} component={UserManagement} />
      <Route path={"/login"} component={LocalLogin} />
      <Route path={"/404"} component={NotFound} />
      <Route path={"/"} component={Dashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
