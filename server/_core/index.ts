import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { morningBriefScheduledHandler } from "../morning-brief-handler";

// REMOVED: findAvailablePort caused port mismatch bugs
// Server MUST always bind to port 3000 so client can reliably connect
// If port 3000 is busy, fail loudly so you notice and fix it

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Enable CORS for all routes - reflect the request origin to support credentials
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.header("Access-Control-Allow-Origin", origin);
    }
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization",
    );
    res.header("Access-Control-Allow-Credentials", "true");

    // Handle preflight requests
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  registerStorageProxy(app);
  registerOAuthRoutes(app);

  // ── Scheduled endpoints (cron callbacks) ─────────────────────────────────
  app.post("/api/scheduled/morning-brief", (req, res) => {
    const lang = (req.body?.lang || req.query?.lang || "nl") as string;
    return morningBriefScheduledHandler(req, res, lang);
  });

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  });

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  const port = parseInt(process.env.PORT || "3000");

  server.listen(port, () => {
    console.log(`[api] server listening on port ${port}`);
  });

  server.on("error", (err: any) => {
    if (err.code === "EADDRINUSE") {
      console.error(`\n❌ FATAL: Port ${port} is already in use!`);
      console.error(`Kill the process using port ${port} and restart.`);
      console.error(`On macOS/Linux: lsof -i :${port} | grep LISTEN | awk '{print $2}' | xargs kill -9`);
      process.exit(1);
    }
    throw err;
  });
}

startServer().catch(console.error);
