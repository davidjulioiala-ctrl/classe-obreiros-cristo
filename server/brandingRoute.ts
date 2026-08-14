import type { Express, Request, Response } from "express";
import PDFDocument from "pdfkit";
import multer from "multer";
import { getAppSetting, setAppSetting, createAuditLog } from "./db";
import { storagePut } from "./storage";
import { getLocalUserFromRequest } from "./_core/localAuthMiddleware";
import { requireSameOrigin } from "./_core/security";
import { drawPdfHeader, loadPdfBranding } from "./pdfBranding";

const MAX_LOGO_BYTES = 5 * 1024 * 1024;
const ALLOWED_LOGO_TYPES = new Set(["image/png", "image/jpeg"]);

const logoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_LOGO_BYTES, files: 1, fields: 5, parts: 5 },
  fileFilter: (_req, file, callback) => {
    if (ALLOWED_LOGO_TYPES.has(file.mimetype)) {
      callback(null, true);
    } else {
      callback(new Error("Formato de imagem inválido. Apenas PNG e JPEG são permitidos."));
    }
  },
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

export function readPreviewBody(body: unknown) {
  const source = body && typeof body === "object" ? body as Record<string, unknown> : {};
  return {
    congregationName: typeof source.congregationName === "string" ? source.congregationName.slice(0, 180) : undefined,
    headerTitleText: typeof source.headerTitleText === "string" ? source.headerTitleText.slice(0, 250) : undefined,
    logoAlignment: source.logoAlignment === "left" || source.logoAlignment === "center" || source.logoAlignment === "right" ? source.logoAlignment : undefined,
    logoSize: source.logoSize === "small" || source.logoSize === "medium" || source.logoSize === "large" ? source.logoSize : undefined,
    headerTextAlignment: source.headerTextAlignment === "left" || source.headerTextAlignment === "center" || source.headerTextAlignment === "right" ? source.headerTextAlignment : undefined,
    headerFontSize: source.headerFontSize === "small" || source.headerFontSize === "medium" || source.headerFontSize === "large" ? source.headerFontSize : undefined,
    templateId: typeof source.templateId === "string" ? source.templateId.slice(0, 64) : undefined,
  };
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
  app.post("/api/settings/organization/preview-pdf", requireSameOrigin, (req: Request, res: Response) => {
    void (async () => {
      try {
        const user = await getLocalUserFromRequest(req);
        if (!user || !canManageBranding(user)) return res.status(403).json({ error: "Sem permissão para gerar a pré-visualização." });

        const branding = await loadPdfBranding(readPreviewBody(req.body));
        const document = new PDFDocument({ size: "A4", margin: 42 });
        const chunks: Buffer[] = [];
        document.on("data", (chunk: Buffer) => chunks.push(chunk));
        document.on("end", () => {
          const filename = "pre-visualizacao-cabecalho.pdf";
          res.status(200).set({ "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "no-store" }).send(Buffer.concat(chunks));
        });
        drawPdfHeader(document, branding, "PRÉ-VISUALIZAÇÃO DO CABEÇALHO", { subtitle: "Documento de teste — as alterações ainda não guardadas são apenas visuais" });
        document.fontSize(10).fillColor("#334155").text("Este ficheiro serve para confirmar a aparência do cabeçalho antes de guardar as definições.", 42, document.y + 12, { width: 511, align: "left" });
        document.moveDown(1.2).fontSize(9).fillColor("#64748b").text(`Logótipo: ${branding.logoAlignment} · ${branding.logoSize} | Texto: ${branding.headerTextAlignment} · Fonte: ${branding.headerFontSize}`, { width: 511, align: "left" });
        document.end();
      } catch (error) {
        console.error("[OrganizationBrandingPreview]", error);
        if (!res.headersSent) return res.status(503).json({ error: "Não foi possível gerar o PDF de pré-visualização." });
      }
    })();
  });

  app.post("/api/settings/organization/logo", requireSameOrigin, (req: Request, res: Response) => {
    logoUpload.single("logo")(req, res, (error: unknown) => {
      void (async () => {
        try {
          if (error) {
            const errMessage = error instanceof Error ? error.message : "Erro no carregamento do ficheiro.";
            return res.status(400).json({ error: errMessage });
          }
          if (!req.file || !req.file.size || req.file.size > MAX_LOGO_BYTES) {
            return res.status(400).json({ error: "O ficheiro excede o tamanho máximo de 5 MB ou está vazio." });
          }
          if (!hasValidLogoSignature(req.file)) {
            return res.status(400).json({ error: "O conteúdo do ficheiro não corresponde a uma imagem PNG ou JPEG válida." });
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
