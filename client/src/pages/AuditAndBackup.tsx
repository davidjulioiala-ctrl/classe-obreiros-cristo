import { useState, useMemo } from "react";
import { Download, FileArchive, Loader2, ShieldCheck, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  const [destination, setDestination] = useState<"local" | "drive">("local");
  const [editingLogId, setEditingLogId] = useState<number | null>(null);
  const [editAction, setEditAction] = useState("");
  const [editEntityType, setEditEntityType] = useState("");
  const [editDetails, setEditDetails] = useState("");

  const utils = trpc.useUtils();
  const auditQuery = trpc.audit.list.useQuery({ limit: 250 });
  const exportBackup = trpc.backup.export.useMutation();
  const updateLog = trpc.audit.update.useMutation();
  const deleteLog = trpc.audit.delete.useMutation();
  const logs = useMemo(() => auditQuery.data ?? [], [auditQuery.data]);

  const handleBackup = async () => {
    try {
      const result = await exportBackup.mutateAsync({ destination });
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      if (destination === "local") {
        downloadJson(`classe-obreiros-cristo-backup-${stamp}.json`, result);
        toast.success("Backup preparado e descarregado localmente.");
      } else {
        toast.success(result.message || "Backup sincronizado com o Google Drive com sucesso.");
      }
      await auditQuery.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível realizar o backup.");
    }
  };

  const startEditLog = (log: typeof logs[0]) => {
    setEditingLogId(log.id);
    setEditAction(log.action);
    setEditEntityType(log.entityType || "");
    setEditDetails(log.details || "");
  };

  const saveEditedLog = async (id: number) => {
    try {
      await updateLog.mutateAsync({ id, action: editAction, entityType: editEntityType, details: editDetails });
      await utils.audit.list.invalidate();
      toast.success("Registo de auditoria atualizado com sucesso.");
      setEditingLogId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar registo.");
    }
  };

  const removeLog = async (id: number) => {
    if (!window.confirm("Tem certeza que deseja eliminar este registo de auditoria?")) return;
    try {
      await deleteLog.mutateAsync({ id });
      await utils.audit.list.invalidate();
      toast.success("Registo eliminado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao eliminar registo.");
    }
  };

  return (
    <DashboardLayoutCustom>
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-600">Administração</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">Auditoria e Backup</h1>
          <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-400">Consulte, edite ou elimine operações registadas e descarregue cópias de segurança localmente ou na nuvem.</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <Card className="border-0 shadow-sm dark:bg-slate-800">
            <CardHeader><CardTitle className="flex items-center gap-2"><FileArchive className="h-5 w-5 text-emerald-600" /> Destino e Salvaguarda</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">Escolha onde pretende guardar o pacote de segurança dos dados da igreja (membros, atividades, finanças, transferências e auditoria).</p>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Destino do backup</label>
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant={destination === "local" ? "default" : "outline"} onClick={() => setDestination("local")} className={destination === "local" ? "bg-emerald-600 text-white hover:bg-emerald-700" : ""}>
                    Computador (Local)
                  </Button>
                  <Button type="button" variant={destination === "drive" ? "default" : "outline"} onClick={() => setDestination("drive")} className={destination === "drive" ? "bg-emerald-600 text-white hover:bg-emerald-700" : ""}>
                    Google Drive
                  </Button>
                </div>
              </div>
              <Button className="w-full bg-emerald-600 text-white hover:bg-emerald-700" onClick={handleBackup} disabled={exportBackup.isPending}>
                {exportBackup.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                {destination === "local" ? "Descarregar para o computador" : "Enviar para o Google Drive"}
              </Button>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm dark:bg-slate-800">
            <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-emerald-600" /> Log de Operações (Totalmente Editável)</CardTitle></CardHeader>
            <CardContent>
              {auditQuery.isLoading ? <p className="text-sm text-slate-500">A carregar registos…</p> : logs.length === 0 ? <p className="rounded-lg bg-slate-50 p-8 text-center text-sm text-slate-500 dark:bg-slate-900">Ainda não existem operações registadas.</p> : <div className="max-h-[30rem] space-y-2 overflow-auto pr-1">{logs.map((log) => <div key={log.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">{editingLogId === log.id ? <div className="space-y-2"><div className="grid grid-cols-2 gap-2"><Input value={editAction} onChange={(e) => setEditAction(e.target.value)} placeholder="Ação" /><Input value={editEntityType} onChange={(e) => setEditEntityType(e.target.value)} placeholder="Entidade" /></div><Input value={editDetails} onChange={(e) => setEditDetails(e.target.value)} placeholder="Detalhes" /><div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => setEditingLogId(null)}>Cancelar</Button><Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => saveEditedLog(log.id)}>Guardar</Button></div></div> : <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-medium text-slate-900 dark:text-white">{log.action} · {log.entityType}</p><p className="mt-1 text-xs text-slate-500">Utilizador #{log.userId}{log.entityId ? ` · Registo #${log.entityId}` : ""} {log.details ? `· ${log.details}` : ""}</p><time className="text-[10px] text-slate-400">{new Date(log.createdAt).toLocaleString("pt-PT")}</time></div><div className="flex items-center gap-1"><Button size="sm" variant="ghost" onClick={() => startEditLog(log)}><Edit2 className="h-4 w-4 text-blue-600" /></Button><Button size="sm" variant="ghost" onClick={() => removeLog(log.id)}><Trash2 className="h-4 w-4 text-red-600" /></Button></div></div>}</div>)}</div>}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayoutCustom>
  );
}
