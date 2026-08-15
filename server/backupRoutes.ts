import type { Express, Request, Response } from "express";
import { getBackupPayload, getBackupScheduleByTaskUid, createBackupVersion, markBackupScheduleRun } from "./db";
import { getLocalUserFromRequest } from "./_core/localAuthMiddleware";
import { sdk } from "./_core/sdk";
import { storageGetSignedUrl } from "./storage";

function isAdmin(user: { role: string } | null | undefined) {
  return Boolean(user && user.role === "admin");
}

export function registerBackupRoutes(app: Express) {
  app.get("/api/backups/:id/download", (req: Request, res: Response) => {
    void (async () => {
      try {
        const user = await getLocalUserFromRequest(req);
        if (!isAdmin(user)) return res.status(403).json({ error: "Apenas administradores podem descarregar backups." });
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Versão de backup inválida." });
        const backup = await getBackupPayload(id);
        if (!backup) return res.status(404).json({ error: "Backup não encontrado." });
        const signedUrl = await storageGetSignedUrl(backup.version.storageKey);
        const response = await fetch(signedUrl);
        if (!response.ok) return res.status(502).json({ error: "Não foi possível obter o ficheiro do backup." });
        const bytes = Buffer.from(await response.arrayBuffer());
        res.setHeader("Content-Type", "application/octet-stream");
        res.setHeader("Content-Disposition", `attachment; filename=backup-${backup.version.id}.json.enc`);
        return res.send(bytes);
      } catch (error) {
        console.error("[BackupDownload]", error);
        return res.status(500).json({ error: "Não foi possível descarregar o backup." });
      }
    })();
  });

  app.post("/api/scheduled/daily-backup", (req: Request, res: Response) => {
    void (async () => {
      try {
        const user = await sdk.authenticateRequest(req);
        if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
        const schedule = await getBackupScheduleByTaskUid(user.taskUid);
        if (!schedule || !schedule.enabled) return res.json({ ok: true, skipped: "orphan-or-disabled" });
        
        const backupResult = await createBackupVersion({ createdBy: -1, destination: schedule.destination, cloudEmail: schedule.cloudEmail ?? undefined, versionLabel: `Backup automático ${new Date().toLocaleString("pt-PT")}` });
        await markBackupScheduleRun(schedule.id);

        return res.json({ ok: true, scheduleId: schedule.id, backupId: backupResult.id });
      } catch (error) {
        console.error("[ScheduledBackup]", error);
        return res.status(500).json({ error: String(error), timestamp: new Date().toISOString() });
      }
    })();
  });
}
