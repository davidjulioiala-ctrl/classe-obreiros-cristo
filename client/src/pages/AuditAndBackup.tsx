import { useMemo } from "react";
import { Download, FileArchive, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DashboardLayoutCustom from "@/components/DashboardLayoutCustom";
import { trpc } from "@/lib/trpc";

function downloadJson(filename: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function AuditAndBackup() {
  const auditQuery = trpc.audit.list.useQuery({ limit: 250 });
  const exportBackup = trpc.backup.export.useMutation();
  const logs = useMemo(() => auditQuery.data ?? [], [auditQuery.data]);

  const handleBackup = async () => {
    try {
      const snapshot = await exportBackup.mutateAsync();
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      downloadJson(`classe-obreiros-cristo-backup-${stamp}.json`, snapshot);
      toast.success("Backup preparado e descarregado para o aparelho.");
      await auditQuery.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível preparar o backup.");
    }
  };

  return (
    <DashboardLayoutCustom>
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-600">Administração</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">Auditoria e backup</h1>
          <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-400">Consulte operações realizadas e descarregue uma cópia dos dados sem expor passwords ou hashes.</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <Card className="border-0 shadow-sm dark:bg-slate-800">
            <CardHeader><CardTitle className="flex items-center gap-2"><FileArchive className="h-5 w-5 text-emerald-600" /> Backup local</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">O ficheiro JSON inclui membros, atividades, presenças, finanças, transferências, relatórios e histórico de auditoria. A password e o hash de cada utilizador ficam excluídos.</p>
              <Button className="w-full bg-emerald-600 text-white hover:bg-emerald-700" onClick={handleBackup} disabled={exportBackup.isPending}>
                {exportBackup.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Descarregar backup
              </Button>
              <p className="text-xs text-slate-500">Para backup automático em Google Drive é necessária uma ligação Google Drive autorizada e configurada para este projeto.</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm dark:bg-slate-800">
            <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-emerald-600" /> Log de operações</CardTitle></CardHeader>
            <CardContent>
              {auditQuery.isLoading ? <p className="text-sm text-slate-500">A carregar registos…</p> : logs.length === 0 ? <p className="rounded-lg bg-slate-50 p-8 text-center text-sm text-slate-500 dark:bg-slate-900">Ainda não existem operações registadas.</p> : <div className="max-h-[28rem] space-y-2 overflow-auto pr-1">{logs.map((log) => <div key={log.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-medium text-slate-900 dark:text-white">{log.action} · {log.entityType}</p><time className="text-xs text-slate-500">{new Date(log.createdAt).toLocaleString("pt-PT")}</time></div><p className="mt-1 text-xs text-slate-500">Utilizador #{log.userId}{log.entityId ? ` · Registo #${log.entityId}` : ""}</p></div>)}</div>}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayoutCustom>
  );
}
