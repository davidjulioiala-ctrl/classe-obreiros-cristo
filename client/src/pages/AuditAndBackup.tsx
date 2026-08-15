import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Clock3, Download, FileArchive, Loader2, Mail, RefreshCw, RotateCcw, ShieldAlert, ShieldCheck, Edit2, LockKeyhole, Trash2, UnlockKeyhole } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import DashboardLayoutCustom from "@/components/DashboardLayoutCustom";
import { trpc } from "@/lib/trpc";

function toDateTimeLocal(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export default function AuditAndBackup() {
  const [destination, setDestination] = useState<"local" | "drive">("local");
  const [cloudEmail, setCloudEmail] = useState("");
  const [backupHour, setBackupHour] = useState("00");
  const [backupMinute, setBackupMinute] = useState("00");
  const [backupEnabled, setBackupEnabled] = useState(false);
  const [editingLogId, setEditingLogId] = useState<number | null>(null);
  const [selectedLogIds, setSelectedLogIds] = useState<number[]>([]);
  const [editAction, setEditAction] = useState("");
  const [editEntityType, setEditEntityType] = useState("");
  const [editDetails, setEditDetails] = useState("");
  const [incidentCategory, setIncidentCategory] = useState("suspeita de acesso");
  const [incidentSeverity, setIncidentSeverity] = useState<"low" | "medium" | "high" | "critical">("high");
  const [incidentTitle, setIncidentTitle] = useState("");
  const [incidentDescription, setIncidentDescription] = useState("");
  const [incidentSource, setIncidentSource] = useState("");
  const [maintenanceReason, setMaintenanceReason] = useState("");
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [maintenanceEstimatedCompletion, setMaintenanceEstimatedCompletion] = useState("");

  const utils = trpc.useUtils();
  const auditQuery = trpc.audit.list.useQuery({ limit: 250 });
  const versionsQuery = trpc.backup.listVersions.useQuery();
  const scheduleQuery = trpc.backup.schedule.useQuery();
  const exportBackup = trpc.backup.export.useMutation();
  const restoreBackup = trpc.backup.restore.useMutation();
  const saveSchedule = trpc.backup.saveSchedule.useMutation();
  const updateLog = trpc.audit.update.useMutation();
  const deleteLog = trpc.audit.delete.useMutation();
  const deleteManyLogs = trpc.audit.deleteMany.useMutation();
  const incidentStateQuery = trpc.incident.getState.useQuery();
  const incidentQuery = trpc.incident.list.useQuery({ limit: 100 });
  const incidentDiagnose = trpc.incident.diagnose.useQuery(undefined, { enabled: false });
  const createIncident = trpc.incident.create.useMutation();
  const updateIncident = trpc.incident.update.useMutation();
  const setMaintenance = trpc.incident.setMaintenance.useMutation();
  const revokeAllSessions = trpc.incident.revokeAllSessions.useMutation();
  const logs = useMemo(() => auditQuery.data ?? [], [auditQuery.data]);
  const incidents = useMemo(() => incidentQuery.data ?? [], [incidentQuery.data]);

  useEffect(() => {
    const schedule = scheduleQuery.data;
    if (!schedule) return;
    setDestination(schedule.destination);
    setCloudEmail(schedule.cloudEmail ?? "");
    setBackupHour(String(schedule.hour).padStart(2, "0"));
    setBackupMinute(String(schedule.minute).padStart(2, "0"));
    setBackupEnabled(schedule.enabled);
  }, [scheduleQuery.data]);

  useEffect(() => {
    const maintenance = incidentStateQuery.data?.maintenance;
    if (!maintenance) return;
    setMaintenanceReason(maintenance.reason ?? "");
    setMaintenanceMessage(maintenance.customMessage ?? "");
    setMaintenanceEstimatedCompletion(toDateTimeLocal(maintenance.estimatedCompletionAt));
  }, [incidentStateQuery.data?.maintenance]);

  const refreshBackups = async () => {
    await Promise.all([versionsQuery.refetch(), auditQuery.refetch(), scheduleQuery.refetch()]);
  };

  const refreshIncidentData = async () => {
    await Promise.all([incidentStateQuery.refetch(), incidentQuery.refetch(), auditQuery.refetch()]);
  };

  const handleCreateIncident = async () => {
    if (!incidentTitle.trim() || !incidentDescription.trim()) {
      toast.error("Indique um título e uma descrição para identificar o incidente.");
      return;
    }
    try {
      await createIncident.mutateAsync({
        category: incidentCategory,
        severity: incidentSeverity,
        title: incidentTitle.trim(),
        description: incidentDescription.trim(),
        source: incidentSource.trim() || undefined,
        affectedRecords: undefined,
      });
      toast.success("Incidente registado na linha do tempo.");
      setIncidentTitle("");
      setIncidentDescription("");
      setIncidentSource("");
      await refreshIncidentData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível registar o incidente.");
    }
  };

  const handleMaintenance = async (enabled: boolean) => {
    if (enabled && !window.confirm("Activar o modo de manutenção? As operações normais serão bloqueadas para todos os utilizadores.")) return;
    const estimatedCompletionAt = maintenanceEstimatedCompletion
      ? new Date(maintenanceEstimatedCompletion).toISOString()
      : null;
    if (maintenanceEstimatedCompletion && Number.isNaN(new Date(maintenanceEstimatedCompletion).getTime())) {
      toast.error("Indique uma data e hora válidas para a conclusão estimada.");
      return;
    }
    try {
      await setMaintenance.mutateAsync({
        enabled,
        reason: maintenanceReason.trim() || undefined,
        customMessage: maintenanceMessage.trim() || undefined,
        estimatedCompletionAt,
      });
      toast.success(enabled ? "Modo de manutenção activado." : "Modo de manutenção desactivado.");
      await refreshIncidentData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível actualizar o modo de manutenção.");
    }
  };

  const handleRevokeSessions = async () => {
    if (!window.confirm("Revogar todas as sessões? Todos os utilizadores, incluindo o administrador actual, terão de iniciar sessão novamente.")) return;
    try {
      await revokeAllSessions.mutateAsync();
      toast.success("Todas as sessões foram revogadas. Será necessário iniciar sessão novamente.");
      window.setTimeout(() => { window.location.href = "/login"; }, 700);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível revogar as sessões.");
    }
  };

  const handleIncidentStatus = async (id: number, status: "open" | "investigating" | "contained" | "resolved") => {
    try {
      await updateIncident.mutateAsync({ id, status, containmentActions: undefined, resolution: undefined });
      toast.success("Estado do incidente actualizado.");
      await refreshIncidentData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível actualizar o incidente.");
    }
  };

  const handleBackup = async () => {
    try {
      const versionLabel = `Backup manual ${new Date().toLocaleString("pt-PT")}`;
      const result = await exportBackup.mutateAsync({ destination, cloudEmail: cloudEmail.trim() || undefined, versionLabel });
      if (destination === "local" && result.id) {
        const anchor = document.createElement("a");
        anchor.href = `/api/backups/${result.id}/download`;
        anchor.download = `backup-${result.id}.json`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
      }
      toast.success(destination === "drive" ? "Backup guardado no armazenamento cloud do sistema." : "Backup criado e descarregado para o computador.");
      await refreshBackups();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível realizar o backup.");
    }
  };

  const handleSchedule = async () => {
    const hour = Number(backupHour);
    const minute = Number(backupMinute);
    if (!Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59) {
      toast.error("Indique uma hora válida entre 00:00 e 23:59.");
      return;
    }
    if (backupEnabled && destination === "drive" && !cloudEmail.trim()) {
      toast.error("Indique o email administrativo para associar aos backups cloud.");
      return;
    }
    try {
      await saveSchedule.mutateAsync({ hour, minute, destination, cloudEmail: cloudEmail.trim() || undefined, enabled: backupEnabled });
      toast.success(backupEnabled ? `Backup automático configurado para ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}.` : "Backup automático desativado.");
      await refreshBackups();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível guardar o agendamento.");
    }
  };

  const handleRestore = async (id: number, label: string) => {
    if (!window.confirm(`Restaurar a versão “${label}”? Esta operação substitui os dados de negócio atuais. Recomenda-se criar um backup antes de continuar.`)) return;
    try {
      await restoreBackup.mutateAsync({ id, confirmation: true });
      toast.success("Backup restaurado. Actualize a página para carregar os dados recuperados.");
      await refreshBackups();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível restaurar o backup.");
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
      toast.success("Registo de auditoria actualizado com sucesso.");
      setEditingLogId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao actualizar registo.");
    }
  };

  const removeManyLogs = async () => {
    if (!selectedLogIds.length || !window.confirm(`Eliminar ${selectedLogIds.length} registos de auditoria?`)) return;
    try { await deleteManyLogs.mutateAsync({ ids: selectedLogIds }); setSelectedLogIds([]); await utils.audit.list.invalidate(); toast.success("Registos eliminados em lote."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Erro ao eliminar registos."); }
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
          <p className="mt-2 max-w-3xl text-slate-600 dark:text-slate-400">Crie versões completas dos dados, descarregue-as para o computador, associe um email administrativo ao armazenamento cloud e restaure uma versão específica quando necessário.</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-amber-300 bg-amber-50 shadow-sm dark:border-amber-900 dark:bg-amber-950/30">
            <CardHeader><CardTitle className="flex items-center gap-2 text-amber-900 dark:text-amber-100"><LockKeyhole className="h-5 w-5" /> Contenção e manutenção</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-6 text-amber-950/80 dark:text-amber-100/80">Bloqueie operações de escrita enquanto investiga um incidente. O login, a consola administrativa de emergência e a recuperação de backups permanecem disponíveis.</p>
              <div><label className="mb-2 block text-sm font-medium text-amber-950 dark:text-amber-100">Motivo apresentado aos utilizadores</label><Input value={maintenanceReason} onChange={(event) => setMaintenanceReason(event.target.value)} maxLength={500} placeholder="Actualização de segurança em curso" /></div>
              <div><label className="mb-2 block text-sm font-medium text-amber-950 dark:text-amber-100">Mensagem personalizada</label><textarea value={maintenanceMessage} onChange={(event) => setMaintenanceMessage(event.target.value)} maxLength={1000} rows={3} placeholder="Estamos a actualizar o sistema. Obrigado pela compreensão." className="w-full resize-y rounded-md border border-amber-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-amber-900 dark:bg-slate-950 dark:text-slate-100" /><p className="mt-1 text-xs text-amber-950/60 dark:text-amber-100/60">Será exibida na página pública de estado. Evite incluir dados internos.</p></div>
              <div><label className="mb-2 block text-sm font-medium text-amber-950 dark:text-amber-100">Conclusão estimada</label><Input type="datetime-local" value={maintenanceEstimatedCompletion} onChange={(event) => setMaintenanceEstimatedCompletion(event.target.value)} /><p className="mt-1 text-xs text-amber-950/60 dark:text-amber-100/60">Opcional; os utilizadores verão a data e hora no seu fuso horário.</p></div>
              <div className="flex flex-wrap gap-2"><Button type="button" className="bg-amber-600 text-white hover:bg-amber-700" disabled={setMaintenance.isPending || incidentStateQuery.data?.maintenance.enabled} onClick={() => void handleMaintenance(true)}><LockKeyhole className="mr-2 h-4 w-4" />Activar manutenção</Button><Button type="button" variant="outline" disabled={setMaintenance.isPending || !incidentStateQuery.data?.maintenance.enabled} onClick={() => void handleMaintenance(false)}><UnlockKeyhole className="mr-2 h-4 w-4" />Desactivar</Button></div>
              {incidentStateQuery.data?.maintenance.enabled && <p className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-200"><AlertTriangle className="h-4 w-4" />Manutenção activa: {incidentStateQuery.data.maintenance.reason || "sem motivo indicado"}</p>}
              <Button type="button" variant="outline" className="w-full border-red-300 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30" disabled={revokeAllSessions.isPending} onClick={() => void handleRevokeSessions()}><ShieldAlert className="mr-2 h-4 w-4" />Revogar todas as sessões</Button>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm dark:bg-slate-800">
            <CardHeader><CardTitle className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-emerald-600" /> Detecção e identificação</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">Registe o que aconteceu, acompanhe a contenção e consulte uma fotografia dos incidentes, auditoria e recomendações de recuperação.</p>
              <div className="grid gap-3 sm:grid-cols-2"><div><label className="mb-1 block text-xs font-medium">Categoria</label><Input value={incidentCategory} onChange={(event) => setIncidentCategory(event.target.value)} maxLength={100} placeholder="Ex.: acesso suspeito" /></div><div><label className="mb-1 block text-xs font-medium">Gravidade</label><select className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={incidentSeverity} onChange={(event) => setIncidentSeverity(event.target.value as typeof incidentSeverity)}><option value="low">Baixa</option><option value="medium">Média</option><option value="high">Alta</option><option value="critical">Crítica</option></select></div></div>
              <Input value={incidentTitle} onChange={(event) => setIncidentTitle(event.target.value)} maxLength={255} placeholder="Título do incidente" />
              <textarea className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={incidentDescription} onChange={(event) => setIncidentDescription(event.target.value)} maxLength={10000} placeholder="Descreva os sintomas, a hora e os dados potencialmente afectados" />
              <Input value={incidentSource} onChange={(event) => setIncidentSource(event.target.value)} maxLength={255} placeholder="Origem: log, utilizador, alerta ou observação" />
              <div className="flex flex-wrap gap-2"><Button type="button" className="bg-emerald-600 text-white hover:bg-emerald-700" disabled={createIncident.isPending} onClick={() => void handleCreateIncident}><ShieldCheck className="mr-2 h-4 w-4" />Registar incidente</Button><Button type="button" variant="outline" disabled={incidentDiagnose.isFetching} onClick={() => void incidentDiagnose.refetch()}><RefreshCw className="mr-2 h-4 w-4" />Executar diagnóstico</Button></div>
              {incidentDiagnose.data && <div className="rounded-lg bg-slate-50 p-3 text-xs leading-5 dark:bg-slate-900"><p><strong>Verificado em:</strong> {new Date(incidentDiagnose.data.diagnostics.checkedAt).toLocaleString("pt-PT")}</p><p><strong>Incidentes recentes:</strong> {incidentDiagnose.data.incidents.length} · <strong>Logs recentes:</strong> {incidentDiagnose.data.recentAudit.length}</p><p><strong>Eventos suspeitos:</strong> {incidentDiagnose.data.diagnostics.detectedProblems.suspiciousEventCount} · <strong>Registos afectados:</strong> {incidentDiagnose.data.diagnostics.forensic.affectedRecords.length}</p><p><strong>Actores identificados:</strong> {incidentDiagnose.data.diagnostics.forensic.actorIds.length || "nenhum"} · <strong>Origens:</strong> {incidentDiagnose.data.diagnostics.forensic.sourceIndicators.length || "nenhuma"}</p><p><strong>Sessões revogadas:</strong> {incidentDiagnose.data.diagnostics.containment.sessionsContainmentActive ? "sim" : "não"}</p><ul className="mt-2 list-disc pl-4">{incidentDiagnose.data.diagnostics.recommendations.map((recommendation: string) => <li key={recommendation}>{recommendation}</li>)}</ul></div>}
            </CardContent>
          </Card>

        <Card className="border-0 shadow-sm dark:bg-slate-800">
          <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-600" /> Linha do tempo de incidentes</CardTitle></CardHeader>
          <CardContent>{incidentQuery.isLoading ? <p className="text-sm text-slate-500">A carregar incidentes…</p> : incidents.length === 0 ? <p className="rounded-lg bg-slate-50 p-6 text-center text-sm text-slate-500 dark:bg-slate-900">Nenhum incidente registado.</p> : <div className="space-y-3">{incidents.map((incident) => <div key={incident.id} className="rounded-lg border border-slate-200 p-4 dark:border-slate-700"><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><p className="font-semibold text-slate-900 dark:text-white">#{incident.id} · {incident.title}</p><p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{incident.category} · Gravidade {incident.severity} · {new Date(incident.createdAt).toLocaleString("pt-PT")}</p><p className="mt-2 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">{incident.description}</p>{incident.attachmentUrl && <a className="mt-3 inline-flex items-center text-sm font-medium text-emerald-700 underline underline-offset-4 hover:text-emerald-900 dark:text-emerald-300 dark:hover:text-emerald-100" href={incident.attachmentUrl} target="_blank" rel="noreferrer">Ver captura anexada{incident.attachmentMimeType ? ` (${incident.attachmentMimeType})` : ""}</a>}</div><select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={incident.status} onChange={(event) => void handleIncidentStatus(incident.id, event.target.value as "open" | "investigating" | "contained" | "resolved")}><option value="open">Aberto</option><option value="investigating">Em investigação</option><option value="contained">Contido</option><option value="resolved">Resolvido</option></select></div></div>)}</div>}</CardContent>
        </Card>
          <Card className="border-0 shadow-sm dark:bg-slate-800">
            <CardHeader><CardTitle className="flex items-center gap-2"><FileArchive className="h-5 w-5 text-emerald-600" /> Criar backup</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant={destination === "local" ? "default" : "outline"} onClick={() => setDestination("local")} className={destination === "local" ? "bg-emerald-600 text-white hover:bg-emerald-700" : ""}>Computador</Button>
                <Button type="button" variant={destination === "drive" ? "default" : "outline"} onClick={() => setDestination("drive")} className={destination === "drive" ? "bg-emerald-600 text-white hover:bg-emerald-700" : ""}>Armazenamento cloud</Button>
              </div>
              <div><label className="mb-2 block text-sm font-medium">Email administrativo associado</label><div className="relative"><Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><Input className="pl-9" type="email" value={cloudEmail} onChange={(event) => setCloudEmail(event.target.value)} placeholder="admin@exemplo.org" /></div><p className="mt-1 text-xs text-slate-500">O email identifica o destino cloud configurado. A conta Google/Drive pode exigir uma ligação própria nas definições de integrações.</p></div>
              <Button className="w-full bg-emerald-600 text-white hover:bg-emerald-700" onClick={handleBackup} disabled={exportBackup.isPending}>{exportBackup.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}{destination === "local" ? "Criar e descarregar backup" : "Criar backup cloud"}</Button>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm dark:bg-slate-800">
            <CardHeader><CardTitle className="flex items-center gap-2"><Clock3 className="h-5 w-5 text-emerald-600" /> Backup automático diário</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-center gap-3 text-sm font-medium"><input type="checkbox" checked={backupEnabled} onChange={(event) => setBackupEnabled(event.target.checked)} /> Fazer backup todos os dias</label>
              <div className="grid grid-cols-2 gap-3"><div><label className="mb-1 block text-xs font-medium">Hora</label><Input type="number" min="0" max="23" value={backupHour} onChange={(event) => setBackupHour(event.target.value)} /></div><div><label className="mb-1 block text-xs font-medium">Minuto</label><Input type="number" min="0" max="59" value={backupMinute} onChange={(event) => setBackupMinute(event.target.value)} /></div></div>
              <p className="text-xs leading-5 text-slate-500">O horário é interpretado em UTC pelo serviço de agendamento. A execução ocorre no servidor, mesmo com o navegador fechado.</p>
              <Button className="w-full" variant="outline" onClick={handleSchedule} disabled={saveSchedule.isPending}>{saveSchedule.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}{backupEnabled ? "Guardar agendamento" : "Desactivar backup automático"}</Button>
              {scheduleQuery.data?.lastRunAt && <p className="text-xs text-emerald-700">Última execução: {new Date(scheduleQuery.data.lastRunAt).toLocaleString("pt-PT")}</p>}
            </CardContent>
          </Card>
        </div>

        <Card className="border-0 shadow-sm dark:bg-slate-800">
          <CardHeader><CardTitle className="flex items-center justify-between gap-3"><span className="flex items-center gap-2"><RotateCcw className="h-5 w-5 text-emerald-600" /> Versões de backup</span><Button variant="outline" size="sm" onClick={() => void versionsQuery.refetch()}><RefreshCw className="mr-2 h-4 w-4" />Actualizar</Button></CardTitle></CardHeader>
          <CardContent>{versionsQuery.isLoading ? <p className="text-sm text-slate-500">A carregar versões…</p> : (versionsQuery.data ?? []).length === 0 ? <p className="rounded-lg bg-slate-50 p-8 text-center text-sm text-slate-500 dark:bg-slate-900">Ainda não existem versões de backup.</p> : <div className="space-y-2">{(versionsQuery.data ?? []).map((version) => <div key={version.id} className="flex flex-col gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium text-slate-900 dark:text-white">{version.versionLabel}</p><p className="text-xs text-slate-500">{new Date(version.createdAt).toLocaleString("pt-PT")} · {version.destination === "drive" ? "Cloud" : "Local"} · {Math.max(1, Math.round(version.fileSize / 1024))} KB</p>{version.cloudEmail && <p className="text-xs text-slate-500">Email: {version.cloudEmail}</p>}</div><div className="flex flex-wrap gap-2"><a className="inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700" href={`/api/backups/${version.id}/download`} download><Download className="mr-2 h-4 w-4" />Descarregar</a><Button variant="outline" size="sm" className="text-amber-700" disabled={restoreBackup.isPending} onClick={() => void handleRestore(version.id, version.versionLabel)}><RotateCcw className="mr-2 h-4 w-4" />Restaurar</Button></div></div>)}</div>}</CardContent>
        </Card>

        <Card className="border-0 shadow-sm dark:bg-slate-800">
          <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-emerald-600" /> Log de operações</CardTitle></CardHeader>
          <CardContent><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><p className="text-sm text-slate-500">{selectedLogIds.length ? `${selectedLogIds.length} selecionado(s)` : "Seleccione operações para eliminar em lote"}</p><Button type="button" size="sm" variant="outline" disabled={!selectedLogIds.length || deleteManyLogs.isPending} onClick={() => void removeManyLogs}><Trash2 className="mr-2 h-4 w-4" />Eliminar seleccionados</Button></div>{auditQuery.isLoading ? <p className="text-sm text-slate-500">A carregar registos…</p> : logs.length === 0 ? <p className="rounded-lg bg-slate-50 p-8 text-center text-sm text-slate-500 dark:bg-slate-900">Ainda não existem operações registadas.</p> : <div className="max-h-[30rem] space-y-2 overflow-auto pr-1">{logs.map((log) => <div key={log.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700"><label className="mb-2 flex items-center gap-2 text-xs text-slate-500"><input type="checkbox" checked={selectedLogIds.includes(log.id)} onChange={(event) => setSelectedLogIds((current) => event.target.checked ? (current.includes(log.id) ? current : [...current, log.id]) : current.filter((id) => id !== log.id))} /> Seleccionar este registo</label>{editingLogId === log.id ? <div className="space-y-2"><div className="grid grid-cols-2 gap-2"><Input value={editAction} onChange={(event) => setEditAction(event.target.value)} placeholder="Acção" /><Input value={editEntityType} onChange={(event) => setEditEntityType(event.target.value)} placeholder="Entidade" /></div><Input value={editDetails} onChange={(event) => setEditDetails(event.target.value)} placeholder="Detalhes" /><div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => setEditingLogId(null)}>Cancelar</Button><Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => void saveEditedLog(log.id)}>Guardar</Button></div></div> : <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-medium text-slate-900 dark:text-white">{log.action} · {log.entityType}</p><p className="mt-1 text-xs text-slate-500">Utilizador #{log.userId}{log.entityId ? ` · Registo #${log.entityId}` : ""} {log.details ? `· ${log.details}` : ""}</p><time className="text-[10px] text-slate-400">{new Date(log.createdAt).toLocaleString("pt-PT")}</time></div><div className="flex items-center gap-1"><Button size="sm" variant="ghost" onClick={() => startEditLog(log)}><Edit2 className="h-4 w-4 text-blue-600" /></Button><Button size="sm" variant="ghost" onClick={() => void removeLog(log.id)}><Trash2 className="h-4 w-4 text-red-600" /></Button></div></div>}</div>)}</div>}</CardContent>
        </Card>
      </div>
    </DashboardLayoutCustom>
  );
}
