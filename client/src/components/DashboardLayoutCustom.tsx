import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/_core/hooks/useAuth";
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
  UserCircle,
  ShieldCheck,
  History,
  AlertTriangle,
  UserCog,
  Package,
} from "lucide-react";
import { useLocation } from "wouter";
import { Toaster } from "@/components/ui/sonner";

interface DashboardLayoutCustomProps {
  children: ReactNode;
}

type MenuItem = {
  icon: typeof Home;
  label: string;
  href: string;
  nested?: boolean;
};

const menuItems: MenuItem[] = [
  { icon: Home, label: "Dashboard", href: "/dashboard" },
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

export default function DashboardLayoutCustom({ children }: DashboardLayoutCustomProps) {
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const [location, navigate] = useLocation();

  const filteredMenuItems = menuItems.filter((item) => {
    if (item.href === "/audit-backup" && user?.role !== "admin") return false;
    if (user?.churchRole === "oficial") {
      return !["Finanças", "Transferências", "Configurações", "Utilizadores"].includes(item.label);
    }
    if (user?.churchRole === "louvor") {
      return ["Dashboard", "Membros", "Louvor"].includes(item.label);
    }
    return true;
  });

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

  const isActive = (href: string) => location === href || (href === "/dashboard" && location === "/") || (href === "/members" && location.startsWith("/members/"));

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <AnimatePresence>
        {mobileSidebarOpen && (
          <motion.button
            type="button"
            aria-label="Fechar menu"
            className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <motion.aside
        aria-label="Navegação principal"
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(84vw,280px)] flex-col border-r border-slate-200 bg-white shadow-lg transition-transform duration-200 dark:border-slate-800 dark:bg-slate-900 ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`} 
        animate={{ width: sidebarExpanded ? 280 : 80 }}
        initial={false}
        transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
      >
        <div className="flex h-20 shrink-0 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-800">
          <AnimatePresence mode="wait">
            {sidebarExpanded && (
              <motion.div
                key="logo"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                className="flex min-w-0 items-center gap-2"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600">
                  <span className="text-lg font-bold text-white">C</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">COC</p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">Gestão eclesiástica</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

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
                <motion.button
                  key={item.href}
                  type="button"
                  aria-current={active ? "page" : undefined}
                  title={sidebarExpanded ? undefined : item.label}
                  onClick={() => goTo(item.href)}
                  className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors sm:px-4 ${item.nested ? "pl-8 text-xs" : ""} ${
                    active
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                      : "text-slate-700 hover:bg-slate-100 hover:text-emerald-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-emerald-400"
                  }`}
                  whileHover={{ x: 3 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <AnimatePresence mode="wait">
                    {sidebarExpanded && (
                      <motion.span
                        key="label"
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -4 }}
                        className="truncate text-sm font-medium"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              );
            })}
          </div>
        </nav>
      </motion.aside>

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
                className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <p className="truncate text-sm font-semibold text-slate-900 sm:hidden dark:text-white">Classe Obreiros de Cristo</p>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            <button
              type="button"
              aria-label="Notificações"
              className="relative rounded-lg p-2 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
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
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-sm font-bold text-white">
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

              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    className="absolute right-0 mt-2 w-52 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800"
                  >
                    <button
                      type="button"
                      onClick={() => goTo("/profile")}
                      className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      <UserCircle className="h-4 w-4" />
                      Meu perfil
                    </button>
                    <button
                      type="button"
                      onClick={() => goTo("/settings")}
                      className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      <Settings className="h-4 w-4" />
                      Configurações
                    </button>
                    <div className="border-t border-slate-200 dark:border-slate-700" />
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      <LogOut className="h-4 w-4" />
                      Sair
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <motion.main
          className="min-w-0 p-4 sm:p-6 lg:p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
        >
          {children}
        </motion.main>
      </div>

      <Toaster />
    </div>
  );
}
