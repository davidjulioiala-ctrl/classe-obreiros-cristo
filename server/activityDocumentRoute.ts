import multer from "multer";
import type { Express, Request, Response } from "express";
import { z } from "zod";
import { createActivityDocument, createAuditLog, deleteActivityDocument, getActivityDocumentById, getActivityById } from "./db";
import { storageGetSignedUrl, storagePut } from "./storage";
import { getLocalUserFromRequest } from "./_core/localAuthMiddleware";
import { requireSameOrigin } from "./_core/security";

const MAX_ACTIVITY_DOCUMENT_BYTES = 15 * 1024 * 1024;
const allowedMimeTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.oasis.opendocument.text",
  "text/plain",
]);

const activityDocumentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_ACTIVITY_DOCUMENT_BYTES, files: 1, fields: 1, parts: 2 },
  fileFilter: (_req, file, callback) => {
    callback(null, allowedMimeTypes.has(file.mimetype));
  },
});

const documentTypeSchema = z.enum(["ata", "relatorio"]);

function hasValidSignature(file: Express.Multer.File) {
  if (file.mimetype === "application/pdf") return file.buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  if (file.mimetype === "application/msword") return file.buffer.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));
  if (file.mimetype.includes("wordprocessingml") || file.mimetype === "application/vnd.oasis.opendocument.text") {
    return file.buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
  }
  return file.mimetype === "text/plain";
}

function safeFileName(originalName: string) {
  const base = originalName.normalize("NFKC").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").slice(0, 180);
  return base || "documento-actividade";
}

function canManageDocuments(user: { role?: string } | null | undefined) {
  return Boolean(user && ["admin", "lider"].includes(user.role ?? ""));
}

export function isPreviewableActivityDocument(mimeType: string) {
  return mimeType === "application/pdf";
}

async function loadActivityDocumentBytes(documentId: number) {
  const document = await getActivityDocumentById(documentId);
  if (!document) return null;
  const signedUrl = await storageGetSignedUrl(document.storageKey);
  const response = await fetch(signedUrl);
  if (!response.ok) throw new Error("storage-fetch-failed");
  return { document, bytes: Buffer.from(await response.arrayBuffer()) };
}

function sendActivityDocument(res: Response, document: { mimeType: string; originalName: string }, bytes: Buffer, inline: boolean) {
  res.setHeader("Content-Type", document.mimeType);
  res.setHeader("Content-Length", String(bytes.length));
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "private, no-store");
  if (inline) {
    res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'self'");
    res.setHeader("Content-Disposition", "inline");
  } else {
    res.setHeader("Content-Disposition", `attachment; filename="${document.originalName}"; filename*=UTF-8''${encodeURIComponent(document.originalName)}`);
  }
  return res.send(bytes);
}

export function registerActivityDocumentRoute(app: Express) {
  app.post("/api/activity-documents/:activityId", requireSameOrigin, (req: Request, res: Response) => {
    activityDocumentUpload.single("file")(req, res, (error: unknown) => {
      void (async () => {
        try {
          if (error) return res.status(400).json({ error: "Anexe um PDF, DOC, DOCX, ODT ou TXT válido até 15 MB." });
          if (req.aborted) return;
          const user = await getLocalUserFromRequest(req);
          if (!user || !canManageDocuments(user)) return res.status(403).json({ error: "Não tem permissão para anexar documentos." });
          const activityId = Number(req.params.activityId);
          if (!Number.isInteger(activityId) || activityId <= 0) return res.status(400).json({ error: "Actividade inválida." });
          const activity = await getActivityById(activityId);
          if (!activity) return res.status(404).json({ error: "Actividade não encontrada." });
          const parsedType = documentTypeSchema.safeParse(req.body?.documentType);
          if (!parsedType.success || !req.file || !req.file.size || req.file.size > MAX_ACTIVITY_DOCUMENT_BYTES || !hasValidSignature(req.file)) {
            return res.status(400).json({ error: "Indique o tipo e anexe um documento válido." });
          }

          const stored = await storagePut(`activity-documents/${activityId}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${safeFileName(req.file.originalname)}`, req.file.buffer, req.file.mimetype);
          if (req.aborted) return;
          const result = await createActivityDocument({
            activityId,
            type: parsedType.data,
            originalName: safeFileName(req.file.originalname),
            storageKey: stored.key,
            storageUrl: stored.url,
            mimeType: req.file.mimetype,
            sizeBytes: req.file.size,
            uploadedBy: user.id,
          });
          return res.status(201).json({ success: true, documentId: Number((result as { insertId?: number }).insertId ?? 0) });
        } catch (uploadError) {
          console.error("[ActivityDocumentUpload]", uploadError);
          return res.status(503).json({ error: "Não foi possível guardar o documento neste momento." });
        }
      });
    });
  });

  app.delete("/api/activity-documents/:documentId", requireSameOrigin, (req: Request, res: Response) => {
    void (async () => {
      try {
        const user = await getLocalUserFromRequest(req);
        if (!user || !canManageDocuments(user)) return res.status(403).json({ error: "Não tem permissão para eliminar documentos." });
        const documentId = Number(req.params.documentId);
        if (!Number.isInteger(documentId) || documentId <= 0) return res.status(400).json({ error: "Documento inválido." });
        const document = await deleteActivityDocument(documentId);
        if (!document) return res.status(404).json({ error: "Documento não encontrado." });
        await createAuditLog({
          userId: user.id,
          action: "apagar",
          entityType: "activityDocument",
          entityId: document.id,
          details: JSON.stringify({ activityId: document.activityId, type: document.type, originalName: document.originalName }),
        });
        return res.status(200).json({ success: true, documentId: document.id });
      } catch (deleteError) {
        console.error("[ActivityDocumentDelete]", deleteError);
        return res.status(503).json({ error: "Não foi possível eliminar o documento." });
      }
    })();
  });

  app.get("/api/activity-documents/:documentId/preview", (req: Request, res: Response) => {
    void (async () => {
      try {
        const user = await getLocalUserFromRequest(req);
        if (!user) return res.status(401).json({ error: "É necessário iniciar sessão." });
        const documentId = Number(req.params.documentId);
        if (!Number.isInteger(documentId) || documentId <= 0) return res.status(400).json({ error: "Documento inválido." });
        const loaded = await loadActivityDocumentBytes(documentId);
        if (!loaded) return res.status(404).json({ error: "Documento não encontrado." });
        if (!isPreviewableActivityDocument(loaded.document.mimeType)) return res.status(415).json({ error: "A pré-visualização está disponível apenas para PDFs." });
        return sendActivityDocument(res, loaded.document, loaded.bytes, true);
      } catch (previewError) {
        console.error("[ActivityDocumentPreview]", previewError);
        return res.status(503).json({ error: "Não foi possível pré-visualizar o documento." });
      }
    })();
  });

  app.get("/api/activity-documents/:documentId/download", (req: Request, res: Response) => {
    void (async () => {
      try {
        const user = await getLocalUserFromRequest(req);
        if (!user) return res.status(401).json({ error: "É necessário iniciar sessão." });
        const documentId = Number(req.params.documentId);
        if (!Number.isInteger(documentId) || documentId <= 0) return res.status(400).json({ error: "Documento inválido." });
        const loaded = await loadActivityDocumentBytes(documentId);
        if (!loaded) return res.status(404).json({ error: "Documento não encontrado." });
        return sendActivityDocument(res, loaded.document, loaded.bytes, false);
      } catch (downloadError) {
        console.error("[ActivityDocumentDownload]", downloadError);
        return res.status(503).json({ error: "Não foi possível descarregar o documento." });
      }
    })();
  });
}

export const activityDocumentUploadLimits = { maxBytes: MAX_ACTIVITY_DOCUMENT_BYTES, allowedMimeTypes: Array.from(allowedMimeTypes) };
