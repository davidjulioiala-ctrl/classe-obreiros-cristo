import { useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import * as QRCode from "qrcode";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

type TwoFactorSetup = {
  secret: string;
  otpauthUri: string;
  recoveryCodes: string[];
};

export default function TwoFactorSettings() {
  const { user, refresh } = useAuth();
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!setup) {
      setQrCode(null);
      return () => {
        cancelled = true;
      };
    }
    const qrGenerator = QRCode as typeof import("qrcode");
    if (typeof qrGenerator.toDataURL !== "function") {
      setQrCode(null);
      return () => {
        cancelled = true;
      };
    }
    void qrGenerator.toDataURL(setup.otpauthUri, {
      width: 240,
      margin: 2,
      errorCorrectionLevel: "M",
    }).then((dataUrl) => {
      if (!cancelled) setQrCode(dataUrl);
    }).catch(() => {
      if (!cancelled) setQrCode(null);
    });
    return () => {
      cancelled = true;
    };
  }, [setup]);

  function normalizeCode(value: string) {
    return value.replace(/[^0-9]/g, "").slice(0, 6);
  }

  async function request(path: string, body?: Record<string, string>) {
    const response = await fetch(path, {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401) throw new Error("A sua sessão expirou. Entre novamente para configurar o 2FA.");
      throw new Error(data.error || data.message || "Não foi possível concluir a operação 2FA.");
    }
    return data as TwoFactorSetup & { twoFactorEnabled?: boolean };
  }

  async function startSetup() {
    setBusy(true);
    try {
      const data = await request("/api/auth/2fa/setup");
      if (!data.secret || !data.otpauthUri || !Array.isArray(data.recoveryCodes)) {
        throw new Error("O servidor não devolveu uma configuração 2FA completa. Tente novamente.");
      }
      setSetup({ secret: data.secret, otpauthUri: data.otpauthUri, recoveryCodes: data.recoveryCodes });
      setCode("");
      toast.success("Configuração 2FA preparada. Guarde os códigos de recuperação.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível iniciar o 2FA.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmSetup() {
    const normalized = normalizeCode(code);
    if (normalized.length !== 6) {
      toast.error("Introduza o código actual de 6 dígitos da aplicação autenticadora.");
      return;
    }
    setBusy(true);
    try {
      const data = await request("/api/auth/2fa/confirm", { code: normalized });
      if (!data.twoFactorEnabled) throw new Error("O servidor não confirmou a activação do 2FA. Tente novamente.");
      setSetup(null);
      setCode("");
      await refresh();
      toast.success("2FA activado para a sua conta.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível activar o 2FA.");
    } finally {
      setBusy(false);
    }
  }

  if (!user) return null;

  return (
    <Card className="border-emerald-200 bg-emerald-50/70 p-5 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/20">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex gap-3">
          <div className="rounded-xl bg-emerald-600 p-2 text-white"><ShieldCheck className="h-5 w-5" /></div>
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-white">Autenticação de dois factores</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">A configuração é obrigatória para utilizar o sistema. O segredo é cifrado no servidor e os códigos de recuperação são de uso único.</p>
            <p className="mt-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">Estado: {user.twoFactorEnabled ? "Activo" : "Configuração obrigatória pendente"}</p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row lg:shrink-0">
          {!user.twoFactorEnabled && !setup && <Button onClick={() => void startSetup()} disabled={busy} className="bg-emerald-600 text-white hover:bg-emerald-700">{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}Configurar 2FA</Button>}
          {user.twoFactorEnabled && <span className="rounded-lg bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">2FA activo e obrigatório</span>}
        </div>
      </div>


      {setup && (
        <div className="mt-5 grid gap-5 border-t border-emerald-200 pt-5 dark:border-emerald-900/50 lg:grid-cols-[240px_minmax(0,1fr)]">
          <div className="flex flex-col items-center gap-3 rounded-xl bg-white p-4 text-center dark:bg-slate-900">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">1. Leia o QR Code</p>
            {qrCode ? <img src={qrCode} alt="QR Code para configurar a autenticação de dois factores" className="h-[210px] w-[210px] rounded-lg border border-slate-200 bg-white p-2" /> : <div className="flex h-[210px] w-[210px] items-center justify-center rounded-lg border border-dashed border-slate-300 text-xs text-slate-500">A gerar QR Code…</div>}
            <p className="text-xs leading-5 text-slate-600 dark:text-slate-400">Abra Google Authenticator, Microsoft Authenticator ou Authy e escolha adicionar uma conta.</p>
          </div>
          <div className="space-y-4 text-sm">
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">2. Se não conseguir ler o QR Code</p>
              <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">Use a chave abaixo na opção de configuração manual da aplicação autenticadora.</p>
              <code className="mt-2 block break-all rounded-lg bg-white p-3 font-mono text-xs text-slate-800 dark:bg-slate-900 dark:text-slate-200">{setup.secret}</code>
            </div>
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">3. Guarde os códigos de recuperação</p>
              <div className="mt-2 grid grid-cols-2 gap-2 rounded-lg bg-white p-3 font-mono text-xs text-slate-800 dark:bg-slate-900 dark:text-slate-200">{setup.recoveryCodes.map((item) => <span key={item}>{item}</span>)}</div>
              <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-400">Cada código só pode ser usado uma vez e não será mostrado novamente depois desta configuração.</p>
            </div>
            <div>
              <label className="mb-1 block font-medium text-slate-700 dark:text-slate-200">4. Introduza o código de 6 dígitos</label>
              <Input value={code} onChange={(event) => setCode(normalizeCode(event.target.value))} inputMode="numeric" autoComplete="one-time-code" placeholder="Código de 6 dígitos" maxLength={6} />
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Depois de introduzir o código actual, clique em Confirmar activação.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void confirmSetup()} disabled={busy || normalizeCode(code).length !== 6} className="bg-emerald-600 text-white hover:bg-emerald-700">{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Confirmar activação</Button>
              <Button variant="outline" onClick={() => { setSetup(null); setQrCode(null); setCode(""); }} disabled={busy}>Cancelar</Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
