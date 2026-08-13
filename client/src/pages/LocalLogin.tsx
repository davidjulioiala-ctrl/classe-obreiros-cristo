import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useLocalAuth } from "@/_core/hooks/useLocalAuth";

export default function LocalLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [bootstrapAvailable, setBootstrapAvailable] = useState(false);
  const [showBootstrap, setShowBootstrap] = useState(false);
  const [bootstrapToken, setBootstrapToken] = useState("");
  const [bootstrapName, setBootstrapName] = useState("");
  const [bootstrapEmail, setBootstrapEmail] = useState("");
  const [bootstrapUsername, setBootstrapUsername] = useState("");
  const [bootstrapPassword, setBootstrapPassword] = useState("");
  const { login, verifyTwoFactor } = useLocalAuth();

  useEffect(() => {
    let active = true;
    void fetch("/api/auth/bootstrap/status", { credentials: "include" })
      .then((response) => response.ok ? response.json() as Promise<{ available?: boolean }> : { available: false })
      .then((data) => { if (active) setBootstrapAvailable(Boolean(data.available)); })
      .catch(() => { if (active) setBootstrapAvailable(false); });
    return () => { active = false; };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      toast.error("Por favor, preencha todos os campos");
      return;
    }

    setIsLoading(true);

    try {
      const result = await login(username, password);
      if (result.twoFactorRequired) {
        setRequiresTwoFactor(true);
        return;
      }
      // Recarrega a aplicação para que o router global valide o cookie local recém-criado.
      window.location.assign("/dashboard");
    } catch (error) {
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBootstrap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bootstrapToken || !bootstrapName || !bootstrapEmail || !bootstrapUsername || !bootstrapPassword) {
      toast.error("Preencha todos os campos do primeiro acesso.");
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/bootstrap", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-Initial-Admin-Token": bootstrapToken },
        body: JSON.stringify({ username: bootstrapUsername, password: bootstrapPassword, name: bootstrapName, email: bootstrapEmail }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Não foi possível criar o administrador inicial.");
      toast.success("Administrador inicial criado. Entre com as novas credenciais.");
      setBootstrapAvailable(false);
      setShowBootstrap(false);
      setUsername(bootstrapUsername);
      setPassword("");
      setBootstrapToken("");
      setBootstrapPassword("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível concluir o primeiro acesso.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTwoFactor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFactorCode.trim()) {
      toast.error("Introduza o código de verificação.");
      return;
    }
    setIsLoading(true);
    try {
      await verifyTwoFactor(twoFactorCode);
      window.location.assign("/dashboard");
    } catch {
      // O hook apresenta a mensagem segura ao utilizador.
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
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-20 right-10 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"
          animate={{
            x: [0, -50, 0],
            y: [0, -30, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50 shadow-2xl">
          <div className="p-8">
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-center mb-8"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
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
            <motion.form
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              onSubmit={requiresTwoFactor ? handleTwoFactor : handleLogin}
              className="space-y-4"
            >
              {requiresTwoFactor ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-lg font-semibold text-white">Verificação em dois passos</p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">Introduza o código de 6 dígitos da sua aplicação autenticadora. Também pode usar um código de recuperação de uso único.</p>
                  </div>
                  <Input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value)}
                    placeholder="Código 2FA"
                    disabled={isLoading}
                    maxLength={16}
                    autoFocus
                    className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-emerald-500"
                  />
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:from-slate-600 disabled:to-slate-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {isLoading ? "A verificar..." : "Verificar código"}
                  </motion.button>
                  <button type="button" className="w-full text-sm text-slate-400 hover:text-white" onClick={() => { setRequiresTwoFactor(false); setTwoFactorCode(""); }}>Voltar</button>
                </div>
              ) : (
                <>
              {/* Username field */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Utilizador
                </label>
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Nome de utilizador"
                  disabled={isLoading}
                  className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-emerald-500"
                />
              </div>

              {/* Password field */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Senha
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Introduza a sua senha"
                    disabled={isLoading}
                    className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-emerald-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 disabled:opacity-50"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Login button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:from-slate-600 disabled:to-slate-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    A entrar...
                  </>
                ) : (
                  "Entrar"
                )}
              </motion.button>
                </>
              )}
            </motion.form>

            {bootstrapAvailable && !requiresTwoFactor && (
              <div className="mt-6 border-t border-slate-700 pt-5">
                {!showBootstrap ? (
                  <button type="button" onClick={() => setShowBootstrap(true)} className="w-full text-sm font-medium text-emerald-400 hover:text-emerald-300">Primeiro acesso: criar administrador</button>
                ) : (
                  <motion.form initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleBootstrap} className="space-y-3">
                    <div><p className="font-semibold text-white">Configuração inicial</p><p className="mt-1 text-xs leading-5 text-slate-400">Use o token entregue ao responsável pela instalação. Este processo só pode ser concluído uma vez.</p></div>
                    <Input value={bootstrapToken} onChange={(event) => setBootstrapToken(event.target.value)} type="password" autoComplete="off" placeholder="Token de bootstrap" disabled={isLoading} className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-500" />
                    <Input value={bootstrapName} onChange={(event) => setBootstrapName(event.target.value)} placeholder="Nome completo" disabled={isLoading} className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-500" />
                    <Input value={bootstrapEmail} onChange={(event) => setBootstrapEmail(event.target.value)} type="email" autoComplete="email" placeholder="Email" disabled={isLoading} className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-500" />
                    <Input value={bootstrapUsername} onChange={(event) => setBootstrapUsername(event.target.value)} autoComplete="username" placeholder="Novo nome de utilizador" disabled={isLoading} className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-500" />
                    <Input value={bootstrapPassword} onChange={(event) => setBootstrapPassword(event.target.value)} type="password" autoComplete="new-password" placeholder="Palavra-passe (mínimo 12 caracteres)" disabled={isLoading} className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-500" />
                    <div className="flex gap-2"><Button type="submit" disabled={isLoading} className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700">{isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Criar administrador</Button><Button type="button" variant="outline" onClick={() => setShowBootstrap(false)} className="border-slate-600 text-slate-200 hover:bg-slate-700">Cancelar</Button></div>
                  </motion.form>
                )}
              </div>
            )}

            {/* Footer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-6 text-center text-xs text-slate-500"
            >
              <p>© 2026 Classe Obreiros de Cristo</p>
              <p>Todos os direitos reservados</p>
            </motion.div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
