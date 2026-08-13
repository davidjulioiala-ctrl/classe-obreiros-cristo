import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export interface LocalUser {
  id: number;
  username: string;
  name: string | null;
  email: string | null;
  role: "user" | "admin";
  churchRole: "lider" | "oficial" | "louvor" | "membro" | "financeiro" | "financeira";
  twoFactorEnabled?: boolean;
}

type AuthResponse = { user?: LocalUser; twoFactorRequired?: boolean; message?: string; error?: string };
type LoginResult = { twoFactorRequired: boolean; user?: LocalUser };

async function readResponse(response: Response) {
  const payload = await response.json().catch(() => ({} as AuthResponse));
  if (!response.ok) throw new Error(payload.error || payload.message || "Não foi possível concluir a operação.");
  return payload as AuthResponse;
}

export function useLocalAuth() {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/auth/me", { credentials: "include" });
      if (response.ok) {
        const data = await response.json() as { user?: LocalUser };
        setUser(data.user || null);
      } else {
        setUser(null);
      }
      setError(null);
    } catch (cause) {
      const nextError = cause instanceof Error ? cause : new Error("Falha ao verificar a sessão.");
      setError(nextError);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (username: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await readResponse(response);
      if (data.twoFactorRequired) return { twoFactorRequired: true } satisfies LoginResult;
      if (!data.user) throw new Error("Resposta de autenticação inválida.");
      setUser(data.user);
      toast.success("Login realizado com sucesso!");
      return { twoFactorRequired: false, user: data.user } satisfies LoginResult;
    } catch (cause) {
      const nextError = cause instanceof Error ? cause : new Error("Erro ao fazer login.");
      setError(nextError);
      toast.error(nextError.message);
      throw nextError;
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyTwoFactor = useCallback(async (code: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await readResponse(response);
      if (!data.user) throw new Error("Resposta de autenticação inválida.");
      setUser(data.user);
      toast.success("Verificação em dois passos concluída.");
      return data.user;
    } catch (cause) {
      const nextError = cause instanceof Error ? cause : new Error("Código 2FA inválido.");
      setError(nextError);
      toast.error(nextError.message);
      throw nextError;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setLoading(true);
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      setUser(null);
      toast.success("Sessão terminada.");
    } catch (cause) {
      const nextError = cause instanceof Error ? cause : new Error("Erro ao terminar a sessão.");
      setError(nextError);
      toast.error(nextError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return useMemo(() => ({
    user,
    loading,
    error,
    isAuthenticated: Boolean(user),
    login,
    verifyTwoFactor,
    logout,
    refresh,
  }), [user, loading, error, login, verifyTwoFactor, logout, refresh]);
}
