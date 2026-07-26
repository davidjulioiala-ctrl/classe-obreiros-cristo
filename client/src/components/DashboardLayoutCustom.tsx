import { useState } from "react";
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
} from "lucide-react";
import { useLocation } from "wouter";
import { Toaster } from "@/components/ui/sonner";

interface DashboardLayoutCustomProps {
  children: React.ReactNode;
}

export default function DashboardLayoutCustom({ children }: DashboardLayoutCustomProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();

  const menuItems = [
    { icon: Home, label: "Dashboard", href: "/dashboard" },
    { icon: Users, label: "Membros", href: "/members" },
    { icon: Calendar, label: "Presenças", href: "/attendance" },
    { icon: BarChart3, label: "Atividades", href: "/activities" },
    { icon: DollarSign, label: "Finanças", href: "/finances" },
    { icon: ArrowRightLeft, label: "Transferências", href: "/transfers" },
    { icon: FileText, label: "Relatórios", href: "/reports" },
    { icon: Music, label: "Louvor", href: "/louvor" },
    { icon: Settings, label: "Configurações", href: "/settings" },
  ];

  // Filter menu based on user role
  const filteredMenuItems = menuItems.filter((item) => {
    if (user?.churchRole === "oficial") {
      return !["Finanças", "Transferências", "Configurações"].includes(item.label);
    }
    if (user?.churchRole === "louvor") {
      return ["Dashboard", "Membros", "Louvor"].includes(item.label);
    }
    return true;
  });

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Sidebar */}
      <motion.div
        className="fixed left-0 top-0 h-screen bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-40 shadow-lg"
        animate={{ width: sidebarOpen ? 280 : 80 }}
        transition={{ duration: 0.3 }}
      >
        {/* Logo */}
        <div className="h-20 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800">
          <AnimatePresence mode="wait">
            {sidebarOpen && (
              <motion.div
                key="logo"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">C</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">COC</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Gestão</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>

        {/* Menu Items */}
        <nav className="p-4 space-y-2">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            return (
              <motion.button
                key={item.href}
                onClick={() => navigate(item.href)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400"
                whileHover={{ x: 4 }}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <AnimatePresence mode="wait">
                  {sidebarOpen && (
                    <motion.span
                      key="label"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-sm font-medium"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </nav>
      </motion.div>

      {/* Main Content */}
      <motion.div
        className="transition-all duration-300"
        animate={{ marginLeft: sidebarOpen ? 280 : 80 }}
      >
        {/* Top Header */}
        <div className="h-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 shadow-sm">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Pesquisar..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Notifications */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <Bell className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </motion.button>

            {/* User Menu */}
            <div className="relative">
              <motion.button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                whileHover={{ scale: 1.02 }}
                className="flex items-center gap-2 px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  {user?.name?.charAt(0).toUpperCase() || "U"}
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {user?.name || "Utilizador"}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                    {user?.churchRole === "lider"
                      ? "Líder"
                      : user?.churchRole === "oficial"
                      ? "Oficial"
                      : "Louvor"}
                  </p>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </motion.button>

              {/* Dropdown Menu */}
              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden z-50"
                  >
                    <button
                      onClick={() => navigate("/profile")}
                      className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      Meu Perfil
                    </button>
                    <button
                      onClick={() => navigate("/settings")}
                      className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      Configurações
                    </button>
                    <div className="border-t border-slate-200 dark:border-slate-700" />
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Sair
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <motion.main
          className="p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {children}
        </motion.main>
      </motion.div>

      <Toaster />
    </div>
  );
}
