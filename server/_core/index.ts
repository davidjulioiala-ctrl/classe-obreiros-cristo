import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerLocalAuthRoutes } from "./localAuth";
import { registerAdminBootstrapRoute } from "../adminBootstrap";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { registerReportPdfRoute } from "../reportPdf";
import { registerTransferPdfRoute } from "../transferPdf";
import { registerFinancialReportRoutes } from "../financialReportRoute";
import { registerBackupRoutes } from "../backupRoutes";
import { serveStatic, setupVite } from "./vite";
import { requireSameOrigin, SECURITY_LIMITS, securityHeaders } from "./security";
import { maintenanceGate } from "./maintenance";
import { getSystemMaintenanceState } from "../db";
import { registerStatusReportRoute } from "../statusReportRoute";
import { registerListExportRoutes } from "../listExportRoute";
import { registerActivityDocumentRoute } from "../activityDocumentRoute";
import { registerActivityPdfRoute } from "../activityPdfRoute";
import { registerBrandingRoute } from "../brandingRoute";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  app.disable("x-powered-by");
  // The hosted preview is served through one trusted reverse proxy. Trusting
  // that hop keeps req.protocol/req.secure aligned with the public HTTPS URL,
  // which is required for the Secure local-session cookie.
  app.set("trust proxy", 1);
  app.use(securityHeaders);
  // The application has no general-purpose upload endpoint. Keep request bodies
  // small to reduce parser exhaustion and malicious payload risk.
  app.use((req, res, next) => {
    const contentType = req.get("content-type")?.toLowerCase() ?? "";
    if (contentType.startsWith("multipart/form-data") && req.path !== "/api/status-report" && !req.path.startsWith("/api/activity-documents/") && req.path !== "/api/settings/organization/logo") {
      return res.status(415).json({ error: "Uploads de ficheiros não estão disponíveis neste endpoint." });
    }
    return next();
  });
  app.use(express.json({ limit: SECURITY_LIMITS.maxJsonBody }));
  app.use(express.urlencoded({ limit: SECURITY_LIMITS.maxUrlEncodedBody, extended: true }));
  registerStorageProxy(app);
  registerLocalAuthRoutes(app);
  registerAdminBootstrapRoute(app);
  registerStatusReportRoute(app);
  registerListExportRoutes(app);
  registerActivityDocumentRoute(app);
  registerActivityPdfRoute(app);
  registerBrandingRoute(app);
  app.get("/api/maintenance", async (_req, res) => {
    try {
      const state = await getSystemMaintenanceState();
      return res.json({ enabled: state.enabled, reason: state.reason, incidentId: state.incidentId });
    } catch {
      return res.status(503).json({ enabled: false });
    }
  });
  app.use(maintenanceGate);
  registerReportPdfRoute(app);
  registerTransferPdfRoute(app);
  registerFinancialReportRoutes(app);
  registerBackupRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    requireSameOrigin,
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
