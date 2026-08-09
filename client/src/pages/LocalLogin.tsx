import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function LocalLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [, navigate] = useLocation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        toast.success("Login realizado com sucesso!");
        navigate("/dashboard");
      } else {
        toast.error("Utilizador ou senha incorretos");
      }
    } catch (error) {
      toast.error("Erro ao fazer login");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 left-10 w-72 h-72 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"
          animate={{
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-20 right-10 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"
          animate={{
            x: [0, -50, 0],
            y: [0, -30, 0],
          }}
          transition={{ duration: 8, repeat: Infinity, delay: 2 }}
        />
      </div>

      {/* Login card */}
      <motion.div
        className="w-full max-w-md relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="p-8 bg-slate-800/80 backdrop-blur-xl border-slate-700 shadow-2xl">
          {/* Logo and title */}
          <motion.div
            className="text-center mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span className="text-white font-bold text-2xl">C</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Classe Obreiros
            </h1>
            <p className="text-emerald-400 text-sm font-medium">
              Sistema de Gestão Eclesiástica
            </p>
          </motion.div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Username input */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Utilizador
              </label>
              <Input
                type="text"
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                className="bg-slate-700 border-slate-600 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-emerald-500"
              />
            </motion.div>

            {/* Password input */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Senha
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="admin123"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="bg-slate-700 border-slate-600 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-emerald-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </motion.div>

            {/* Login button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Button
                type="submit"
                disabled={isLoading || !username || !password}
                className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold py-2 h-10 rounded-lg transition-all"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    A entrar...
                  </>
                ) : (
                  "Entrar"
                )}
              </Button>
            </motion.div>
          </form>

          {/* Demo credentials hint */}
          <motion.div
            className="mt-6 p-4 bg-slate-700/50 rounded-lg border border-slate-600"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <p className="text-xs text-slate-400 mb-2 font-semibold">
              Credenciais de Demonstração:
            </p>
            <div className="space-y-1 text-xs text-slate-300">
              <p>
                <span className="text-emerald-400">Utilizador:</span> admin
              </p>
              <p>
                <span className="text-emerald-400">Senha:</span> admin123
              </p>
            </div>
          </motion.div>

          {/* Footer */}
          <motion.div
            className="mt-6 text-center text-xs text-slate-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            <p>© 2026 Classe Obreiros de Cristo</p>
            <p>Todos os direitos reservados</p>
          </motion.div>
        </Card>
      </motion.div>
    </div>
  );
}
