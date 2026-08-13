import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { LocalUser } from "@/_core/hooks/useLocalAuth";

const IDLE_TIMEOUT_MS = 20 * 60 * 1000;
const WARNING_AT_MS = 18 * 60 * 1000;
const ACTIVITY_SYNC_INTERVAL_MS = 30 * 1000;

function notifyServerOfActivity() {
  void fetch("/api/auth/activity", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  }).catch(() => undefined);
}

export default function SessionInactivityGuard({ user, logout }: { user: LocalUser | null; logout: () => Promise<void> }) {
  const lastActivityRef = useRef(Date.now());
  const lastServerSyncRef = useRef(0);
  const logoutRef = useRef(logout);
  const [warningVisible, setWarningVisible] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(120);

  useEffect(() => {
    logoutRef.current = logout;
  }, [logout]);

  const registerActivity = useCallback(() => {
    if (!user) return;
    const now = Date.now();
    lastActivityRef.current = now;
    setWarningVisible(false);
    setRemainingSeconds(120);
    if (now - lastServerSyncRef.current >= ACTIVITY_SYNC_INTERVAL_MS) {
      lastServerSyncRef.current = now;
      notifyServerOfActivity();
    }
  }, [user]);

  const handleActivity = useCallback(() => {
    if (!user) return;
    const idleMs = Date.now() - lastActivityRef.current;
    if (idleMs >= IDLE_TIMEOUT_MS) {
      void logoutRef.current();
      return;
    }
    registerActivity();
  }, [registerActivity, user]);

  useEffect(() => {
    if (!user) {
      setWarningVisible(false);
      return;
    }

    lastActivityRef.current = Date.now();
    lastServerSyncRef.current = 0;
    const activityEvents = ["click", "keydown", "mousemove", "scroll", "touchstart", "focus", "visibilitychange"];
    activityEvents.forEach((eventName) => window.addEventListener(eventName, handleActivity, { passive: true }));

    const interval = window.setInterval(() => {
      const idleMs = Date.now() - lastActivityRef.current;
      if (idleMs >= IDLE_TIMEOUT_MS) {
        window.clearInterval(interval);
        void logoutRef.current();
        return;
      }
      if (idleMs >= WARNING_AT_MS) {
        setWarningVisible(true);
        setRemainingSeconds(Math.max(0, Math.ceil((IDLE_TIMEOUT_MS - idleMs) / 1000)));
      }
    }, 1000);

    return () => {
      window.clearInterval(interval);
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, handleActivity));
    };
  }, [handleActivity, user]);

  if (!user || !warningVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" role="presentation">
      <div className="w-full max-w-md rounded-2xl border border-amber-200 bg-white p-6 shadow-2xl dark:border-amber-900 dark:bg-slate-900" role="dialog" aria-modal="true" aria-labelledby="session-timeout-title">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300" aria-hidden="true">!</div>
        <h2 id="session-timeout-title" className="text-xl font-bold text-slate-900 dark:text-white">Sessão prestes a terminar</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">A sessão será terminada por segurança devido à inactividade em <strong>{remainingSeconds} segundos</strong>.</p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => { void logoutRef.current(); }}>Terminar sessão</Button>
          <Button className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={handleActivity}>Continuar sessão</Button>
        </div>
      </div>
    </div>
  );
}
