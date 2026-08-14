import { ReactNode, useState } from "react";
import { useLocalAuth } from "@/_core/hooks/useLocalAuth";
import { Button } from "@/components/ui/button";
import {
  Menu,
  X,
  LogOut,
  Users,
  Calendar,
  DollarSign,
  FileText,
  Settings,
  Home,
  BarChart3,
  ArrowRightLeft,
  Music,
  Bell,
  Search,
  ChevronDown,
  ShieldCheck,
  History,
  AlertTriangle,
  UserCog,
  Package,
} from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

interface DashboardLayoutCustomProps {
  children: ReactNode;
}

export type MenuItem = {
  icon: typeof Home;
  label: string;
  href: string;
  nested?: boolean;
};

export type NavigationUser = { role?: string | null; churchRole?: string | null } | null | undefined;

export const menuItems: MenuItem[] = [
  { icon: Home, label: "Página Inicial", href: "/dashboard" },
  { icon: Users, label: "Membros", href: "/members" },
  { icon: AlertTriangle, label: "Campos em falta", href: "/members/incomplete", nested: true },
  { icon: Calendar, label: "Presenças", href: "/attendance" },
  { icon: BarChart3, label: "Atividades", href: "/activities" },
  { icon: DollarSign, label: "Finanças", href: "/finances" },
  { icon: ArrowRightLeft, label: "Transferências", href: "/transfers" },
  { icon: History, label: "Histórico", href: "/history" },
  { icon: FileText, label: "Relatórios", href: "/reports" },
  { icon: Package, label: "Materiais", href: "/materials" },
  { icon: Music, label: "Louvor", href: "/louvor" },
  { icon: Settings, label: "Configurações", href: "/settings" },
  { icon: UserCog, label: "Utilizadores", href: "/users" },
  { icon: ShieldCheck, label: "Auditoria e backup", href: "/audit-backup" },
];

export function getVisibleMenuItems(user: NavigationUser) {
  const isAdmin = user?.role === "admin";
  const churchRole = user?.churchRole ?? "membro";

  return menuItems.filter((item) => {
    if (isAdmin) return true;
    if (["/users", "/audit-backup"].includes(item.href)) return false;
    if (churchRole === "louvor") return ["Página Inicial", "Membros", "Louvor"].includes(item.label);
    if (churchRole === "oficial") return !["Finanças", "Transferências", "Utilizadores", "Louvor", "Configurações"].includes(item.label);
    return true;
  });
}

export default function DashboardLayoutCustom({ children }: DashboardLayoutCustomProps) {
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, logout } = useLocalAuth();
  const [location, navigate] = useLocation();
  const organizationQuery = trpc.settings.getPublicOrganization.useQuery();
  const organizationName = organizationQuery.data?.organizationName ?? "Classe Obreiros de Cristo";

  const filteredMenuItems = getVisibleMenuItems(user);

  const goTo = (href: string) => {
    setMobileSidebarOpen(false);
    setUserMenuOpen(false);
    navigate(href);
  };

  const handleLogout = async () => {
    setUserMenuOpen(false);
    await logout();
    navigate("/");
  };

  const isActive = (href: string) => {
    const pathname = location.split("?")[0];
    if (href === "/dashboard") return pathname === "/" || pathname === "/dashboard";
    if (href === "/members") return pathname === "/members" || (pathname.startsWith("/members/") && pathname !== "/members/incomplete");
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-background to-muted dark:from-background dark:to-muted">
      {mobileSidebarOpen && (
        <button
          type="button"
          aria-label="Fechar menu"
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      <aside
        aria-label="Navegação principal"
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-200 bg-white shadow-lg transition-[width,transform] duration-200 dark:border-slate-800 dark:bg-slate-900 ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"} ${sidebarExpanded ? "w-[min(84vw,280px)]" : "w-20"}`}
      >
        <div className="flex h-20 shrink-0 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-800">
          {sidebarExpanded && (
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80">
                <span className="text-lg font-bold text-white">C</span>
              </div>
              <div className="min-w-0">
                <p className="max-w-[180px] truncate text-sm font-bold text-slate-900 dark:text-white">{organizationName}</p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">Gestão eclesiástica</p>
              </div>
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            aria-label={sidebarExpanded ? "Recolher menu" : "Expandir menu"}
            onClick={() => setSidebarExpanded((value) => !value)}
            className="shrink-0 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {sidebarExpanded ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4" aria-label="Módulos">
          <div className="space-y-1.5">
            {filteredMenuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <button
                  key={item.href}
                  type="button"
                  aria-current={active ? "page" : undefined}
                  title={sidebarExpanded ? undefined : item.label}
                  onClick={() => goTo(item.href)}
                  className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-all active:scale-[0.98] sm:px-4 ${item.nested ? "pl-8 text-xs" : ""} ${
                    active
                      ? "bg-primary/10 text-primary dark:bg-primary/20"
                      : "text-foreground/80 hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 hover:translate-x-1"
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {sidebarExpanded && (
                    <span className="truncate text-sm font-medium">
                      {item.label}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      </aside>

      <div className={`min-h-screen transition-[padding] duration-200 ${sidebarExpanded ? "lg:pl-[280px]" : "lg:pl-20"}`}>
        <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 shadow-sm backdrop-blur sm:min-h-20 sm:px-6 lg:px-8 dark:border-slate-800 dark:bg-slate-900/95">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Abrir menu"
              className="shrink-0 lg:hidden"
              onClick={() => setMobileSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="relative hidden w-full max-w-md sm:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                placeholder="Pesquisar..."
                aria-label="Pesquisar"
                className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <p className="truncate text-sm font-semibold text-slate-900 sm:hidden dark:text-white">{organizationName}</p>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            <button
              type="button"
              aria-label="Abrir preferências de notificações"
              title="Abrir preferências de notificações"
              onClick={() => goTo("/settings?tab=notifications")}
              className="relative rounded-lg p-2 transition-colors hover:bg-primary/10 dark:hover:bg-primary/20"
            >
              <Bell className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
            </button>

            <div className="relative">
              <button
                type="button"
                aria-expanded={userMenuOpen}
                onClick={() => setUserMenuOpen((value) => !value)}
                className="flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-slate-100 sm:px-3 sm:py-2 dark:hover:bg-slate-800"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 text-sm font-bold text-primary-foreground">
                  {user?.name?.charAt(0).toUpperCase() || "U"}
                </div>
                <div className="hidden max-w-32 text-left sm:block">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{user?.name || "Utilizador"}</p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {user?.churchRole === "lider" ? "Líder" : user?.churchRole === "oficial" ? "Oficial" : "Louvor"}
                  </p>
                </div>
                <ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                  <div className="border-b border-slate-100 px-3 py-2 sm:hidden dark:border-slate-700">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{user?.name || "Utilizador"}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {user?.churchRole === "lider" ? "Líder" : user?.churchRole === "oficial" ? "Oficial" : "Louvor"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Terminar sessão</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8" id="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
