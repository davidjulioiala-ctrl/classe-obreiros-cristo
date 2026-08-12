import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

interface LocalUser {
  id: number;
  username: string;
  name: string;
  email: string;
  role: "user" | "admin";
  churchRole: "lider" | "oficial" | "louvor" | "membro";
}

export function useLocalAuth() {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/auth/me");
        
        if (response.ok) {
          const data = await response.json();
          setUser(data.user || null);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });

        if (!response.ok) {
          throw new Error("Utilizador ou senha incorretos");
        }

        const data = await response.json();
        setUser(data.user);
        toast.success("Login realizado com sucesso!");
        return data.user;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao fazer login";
        setError(err instanceof Error ? err : new Error(message));
        toast.error(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      setLoading(true);
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      toast.success("Logout realizado com sucesso!");
    } catch (err) {
      console.error("Logout failed:", err);
      toast.error("Erro ao fazer logout");
    } finally {
      setLoading(false);
    }
  }, []);

  const state = useMemo(
    () => ({
      user,
      loading,
      error,
      isAuthenticated: Boolean(user),
    }),
    [user, loading, error]
  );

  return {
    ...state,
    login,
    logout,
  };
}
