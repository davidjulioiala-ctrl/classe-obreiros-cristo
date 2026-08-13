import type { Express, Request, Response } from "express";
import multer from "multer";
import { getAppSetting, setAppSetting, createAuditLog } from "./db";
import { storagePut } from "./storage";
import { getLocalUserFromRequest } from "./_core/localAuthMiddleware";
import { requireSameOrigin } from "./_core/security";

const MAX_LOGO_BYTES = 5 * 1024 * 1024;
const ALLOWED_LOGO_TYPES = new Set(["image/png", "image/jpeg"]);

const logoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_LOGO_BYTES, files: 1, fields: 0, parts: 1 },
  fileFilter: (_req, file, callback) => callback(null, ALLOWED_LOGO_TYPES.has(file.mimetype)),
});

function hasValidLogoSignature(file: Express.Multer.File) {
  if (file.mimetype === "image/png") {
    return file.buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  return file.mimetype === "image/jpeg" && file.buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
}

function safeLogoName(originalName: string) {
  const normalized = originalName.normalize("NFKC").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").slice(0, 120);
  return normalized || "logo-congregacao";
}

function canManageBranding(user: { role?: string; churchRole?: string } | null | undefined) {
  return Boolean(user && (user.role === "admin" || user.churchRole === "lider"));
}

async function readOrganizationSettings() {
  const raw = await getAppSetting("organization");
  if (!raw) return {} as Record<string, unknown>;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function registerBrandingRoute(app: Express) {
  app.post("/api/settings/organization/logo", requireSameOrigin, (req: Request, res: Response) => {
    logoUpload.single("logo")(req, res, (error: unknown) => {
      void (async () => {
        try {
          if (error || !req.file || !req.file.size || req.file.size > MAX_LOGO_BYTES || !hasValidLogoSignature(req.file)) {
            return res.status(400).json({ error: "Anexe um logótipo PNG ou JPEG válido até 5 MB." });
          }
          const user = await getLocalUserFromRequest(req);
          if (!user || !canManageBranding(user)) return res.status(403).json({ error: "Sem permissão para alterar a identidade da congregação." });

          const stored = await storagePut(
            `organization-branding/${user.id}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${safeLogoName(req.file.originalname)}`,
            req.file.buffer,
            req.file.mimetype
          );
          const organization = await readOrganizationSettings();
          const nextSettings = { ...organization, logoKey: stored.key, logoUrl: stored.url };
          await setAppSetting("organization", JSON.stringify(nextSettings));
          await createAuditLog({ userId: user.id, action: "atualizar", entityType: "organization_branding", details: JSON.stringify({ logo: true, mimeType: req.file.mimetype, sizeBytes: req.file.size }) });
          return res.status(201).json({ success: true, logoUrl: stored.url, logoKey: stored.key });
        } catch (uploadError) {
          console.error("[OrganizationLogoUpload]", uploadError);
          return res.status(503).json({ error: "Não foi possível guardar o logótipo neste momento." });
        }
      })();
    });
  });
}
