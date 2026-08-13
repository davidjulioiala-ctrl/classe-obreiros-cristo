import type { Express, Request, Response } from "express";
import multer from "multer";
import { z } from "zod";
import { createSecurityIncident } from "./db";
import { storagePut } from "./storage";
import { requireSameOrigin, safeText } from "./_core/security";

const REPORT_WINDOW_MS = 15 * 60 * 1000;
const MAX_REPORTS_PER_WINDOW = 3;
const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;
const reportAttempts = new Map<string, { count: number; windowStartedAt: number }>();

const reportSchema = z.object({
  category: z.enum(["operational", "access", "data", "security", "other"]),
  description: safeText(4000),
});

const screenshotUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_SCREENSHOT_BYTES,
    files: 1,
    fields: 2,
    parts: 3,
  },
  fileFilter: (_req, file, callback) => {
    if (["image/png", "image/jpeg", "image/webp"].includes(file.mimetype)) {
      callback(null, true);
      return;
    }
    callback(new Error("Formato de captura não permitido."));
  },
});

function getClientKey(req: Request) {
  return req.ip || req.socket.remoteAddress || "unknown";
}

function consumeReportAttempt(key: string) {
  const now = Date.now();
  const current = reportAttempts.get(key);
  if (!current || now - current.windowStartedAt >= REPORT_WINDOW_MS) {
    reportAttempts.set(key, { count: 1, windowStartedAt: now });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (current.count >= MAX_REPORTS_PER_WINDOW) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((REPORT_WINDOW_MS - (now - current.windowStartedAt)) / 1000)),
    };
  }

  current.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

function startsWithBytes(buffer: Buffer, signature: number[]) {
  return buffer.subarray(0, signature.length).equals(Buffer.from(signature));
}

function hasValidImageSignature(file: Express.Multer.File) {
  if (file.mimetype === "image/png") {
    return startsWithBytes(file.buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  }
  if (file.mimetype === "image/jpeg") {
    return startsWithBytes(file.buffer, [0xff, 0xd8, 0xff]);
  }
  if (file.mimetype === "image/webp") {
    return file.buffer.length >= 12 && file.buffer.toString("ascii", 0, 4) === "RIFF" && file.buffer.toString("ascii", 8, 12) === "WEBP";
  }
  return false;
}

function getScreenshotExtension(mimeType: string) {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

function isMulterError(error: unknown, code: string) {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === code);
}

function sendUploadError(error: unknown, res: Response) {
  if (isMulterError(error, "LIMIT_FILE_SIZE")) {
    return res.status(413).json({ success: false, error: "A captura deve ter no máximo 5 MB." });
  }
  return res.status(400).json({ success: false, error: "Anexe apenas uma captura PNG, JPEG ou WEBP válida." });
}

export async function handleStatusReport(req: Request, res: Response) {
  const attempt = consumeReportAttempt(getClientKey(req));
  if (!attempt.allowed) {
    res.setHeader("Retry-After", String(attempt.retryAfterSeconds));
    return res.status(429).json({ success: false, error: "Foram recebidos vários relatos. Tente novamente mais tarde." });
  }

  const parsed = reportSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: "Indique uma categoria e descreva o problema sem código ou marcação." });
  }

  const screenshot = req.file;
  if (screenshot && (!screenshot.size || screenshot.size > MAX_SCREENSHOT_BYTES || !hasValidImageSignature(screenshot))) {
    return res.status(400).json({ success: false, error: "A captura não corresponde a uma imagem PNG, JPEG ou WEBP válida." });
  }

  try {
    let attachment: {
      attachmentKey: string;
      attachmentUrl: string;
      attachmentMimeType: string;
      attachmentSize: number;
    } | null = null;

    if (screenshot) {
      const extension = getScreenshotExtension(screenshot.mimetype);
      const stored = await storagePut(`status-reports/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${extension}`, screenshot.buffer, screenshot.mimetype);
      attachment = {
        attachmentKey: stored.key,
        attachmentUrl: stored.url,
        attachmentMimeType: screenshot.mimetype,
        attachmentSize: screenshot.size,
      };
    }

    const categoryLabels: Record<typeof parsed.data.category, string> = {
      operational: "Funcionamento geral",
      access: "Acesso ou autenticação",
      data: "Dados ou registos",
      security: "Segurança",
      other: "Outro problema",
    };
    const incident = await createSecurityIncident({
      category: `reporte-publico:${parsed.data.category}`,
      severity: parsed.data.category === "security" ? "medium" : "low",
      title: `Reporte público: ${categoryLabels[parsed.data.category]}`,
      description: parsed.data.description,
      source: "pagina-de-estado",
      ...(attachment ?? {}),
      affectedRecords: null,
      containmentActions: null,
      resolution: null,
      containedAt: null,
      resolvedAt: null,
      createdBy: 0,
    });

    return res.status(201).json({ success: true, reference: incident.incidentCode });
  } catch (error) {
    console.error("[StatusReport] Failed to create public report:", error);
    return res.status(503).json({ success: false, error: "Não foi possível registar o reporte neste momento." });
  }
}

export function registerStatusReportRoute(app: Express) {
  app.post("/api/status-report", requireSameOrigin, (req: Request, res: Response) => {
    screenshotUpload.single("screenshot")(req, res, (error: unknown) => {
      if (error) {
        sendUploadError(error, res);
        return;
      }
      void handleStatusReport(req, res);
    });
  });
}

export function resetStatusReportRateLimitForTests() {
  reportAttempts.clear();
}

export const statusReportUploadLimits = {
  maxScreenshotBytes: MAX_SCREENSHOT_BYTES,
  maxReportsPerWindow: MAX_REPORTS_PER_WINDOW,
};
