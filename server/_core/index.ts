import "dotenv/config";
import express from "express";
import { createServer } from "http";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
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

  // ── Legal pages (required by Apple App Store) ────────────────────────────
  // Apple requires a publicly reachable Privacy Policy URL for every app.
  // Served here so https://<domain>/privacy works without a separate site.
  const legalPage = (title: string, bodyHtml: string) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${title} — Higgins MC</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:760px;margin:0 auto;padding:40px 20px;line-height:1.6;color:#111;background:#fff}h1{font-size:28px}h2{font-size:19px;margin-top:28px}a{color:#0a7ea4}small{color:#666}</style>
</head><body>${bodyHtml}</body></html>`;

  app.get("/privacy", (_req, res) => {
    res.set("Content-Type", "text/html; charset=utf-8").send(
      legalPage(
        "Privacy Policy",
        `<h1>Privacy Policy</h1>
        <p><small>Last updated: ${new Date().toISOString().slice(0, 10)}</small></p>
        <p>Higgins Mission Control (“Higgins MC”, “the app”) is a private, personal executive command center. This policy explains what data the app handles and how.</p>
        <h2>Information we process</h2>
        <p>The app processes the data you provide to operate its features: your daily briefing content, approvals, agent activity, documents you add, and chat messages with the Higgins assistant. If you enable weather, your approximate location is used solely to retrieve local weather and is not stored for any other purpose.</p>
        <h2>Push notifications</h2>
        <p>If you grant permission, the app uses push notifications to alert you to briefings and relevant updates. A device push token is used only to deliver these notifications.</p>
        <h2>How data is used</h2>
        <p>Data is used only to provide the app’s functionality to you. We do not sell your data and do not use it for third-party advertising.</p>
        <h2>Data retention &amp; deletion</h2>
        <p>You may request deletion of your account data at any time by contacting the address below. Local data stored on your device is removed when you delete the app.</p>
        <h2>Contact</h2>
        <p>For privacy questions or data deletion requests, contact: <a href="mailto:privacy@higgins-mc.app">privacy@higgins-mc.app</a></p>
        <p><a href="/terms">Terms of Use</a></p>`,
      ),
    );
  });

  app.get("/terms", (_req, res) => {
    res.set("Content-Type", "text/html; charset=utf-8").send(
      legalPage(
        "Terms of Use",
        `<h1>Terms of Use</h1>
        <p><small>Last updated: ${new Date().toISOString().slice(0, 10)}</small></p>
        <p>By using Higgins Mission Control you agree to use the app for your own lawful, personal or business purposes. The app is provided “as is” without warranties. We are not liable for decisions made based on information shown in the app.</p>
        <h2>Contact</h2>
        <p><a href="mailto:support@higgins-mc.app">support@higgins-mc.app</a></p>
        <p><a href="/privacy">Privacy Policy</a></p>`,
      ),
    );
  });

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  // ── Serve the exported Expo web app (static SPA) ─────────────────────────
  // WHY: The published domain should open the actual app UI in a browser, not
  // a 404. `pnpm build:web` exports the web bundle to dist/web. We serve it
  // here AFTER all /api, /privacy, /terms routes so those keep working, and
  // add a catch-all fallback to index.html for client-side routing.
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  // dist/index.js (bundled server) sits next to dist/web after build
  const webDirCandidates = [
    path.resolve(__dirname, "web"),
    path.resolve(__dirname, "../web"),
    path.resolve(process.cwd(), "dist/web"),
  ];
  const webDir = webDirCandidates.find((d) => fs.existsSync(path.join(d, "index.html")));

  if (webDir) {
    console.log(`[web] serving static web app from ${webDir}`);

    // ── Inject iOS "Add to Home Screen" icon + PWA meta tags ───────────────
    // WHY: Expo's exported index.html only has a small <link rel="icon"> for the
    // browser tab. iOS Safari uses <link rel="apple-touch-icon"> for the Home
    // Screen icon; without it Safari falls back to a screenshot of the page.
    // We inject the Higgins logo (served from public/ -> dist/web) so the Home
    // Screen shortcut shows the real app icon. Tags are added once into <head>.
    const HEAD_INJECT = [
      '<link rel="apple-touch-icon" href="/apple-touch-icon.png" />',
      '<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />',
      '<link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />',
      '<link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />',
      '<meta name="apple-mobile-web-app-capable" content="yes" />',
      '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />',
      '<meta name="apple-mobile-web-app-title" content="Higgins MC" />',
      '<meta name="theme-color" content="#0b1416" />',
      '<link rel="manifest" href="/manifest.webmanifest" />',
    ].join("");

    const htmlCache = new Map<string, string>();
    const readHtmlWithIcons = (filePath: string): string => {
      const cached = htmlCache.get(filePath);
      if (cached) return cached;
      let html = fs.readFileSync(filePath, "utf8");
      if (!html.includes("apple-touch-icon")) {
        html = html.replace(/<\/head>/i, `${HEAD_INJECT}</head>`);
      }
      htmlCache.set(filePath, html);
      return html;
    };
    const sendHtml = (res: express.Response, filePath: string) => {
      res.type("html").send(readHtmlWithIcons(filePath));
    };

    // Serve a minimal web manifest so iOS/Android recognise it as an app.
    app.get("/manifest.webmanifest", (_req, res) => {
      res.type("application/manifest+json").send(
        JSON.stringify({
          name: "Higgins MC",
          short_name: "Higgins MC",
          start_url: "/",
          display: "standalone",
          background_color: "#0b1416",
          theme_color: "#0b1416",
          icons: [
            { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
            { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
          ],
        }),
      );
    });

    // index: false -> do NOT let static middleware auto-serve index.html for "/",
    // otherwise the raw (icon-less) HTML would be returned before our injector.
    app.use(express.static(webDir, { index: false }));
    // Explicit root: serve the injected HTML.
    app.get("/", (_req, res) => sendHtml(res, path.join(webDir, "index.html")));
    // SPA fallback: any non-API GET returns index.html so Expo Router handles it
    app.get("*", (req, res, next) => {
      if (req.method !== "GET") return next();
      if (req.path.startsWith("/api")) return next();
      // Serve the route's own static html if it exists (Expo exports per-route html)
      const routeHtml = path.join(webDir, req.path.replace(/^\/+/, ""), "index.html");
      if (req.path !== "/" && fs.existsSync(routeHtml)) {
        return sendHtml(res, routeHtml);
      }
      return sendHtml(res, path.join(webDir, "index.html"));
    });
  } else {
    console.warn("[web] no exported web app found (dist/web/index.html missing) — root will 404 until `pnpm build:web` runs");
  }

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

// ── Global resilience: never let a single error kill the whole server ─────
// WHY: An unhandled rejection or uncaught exception (e.g. a failed LLM call
// in a cron handler) would otherwise crash the Node process, taking the API
// offline and causing 502s in the app until a restart. Logging instead of
// crashing keeps the API reachable.
process.on("unhandledRejection", (reason) => {
  console.error("[api] Unhandled promise rejection (non-fatal):", reason);
});

process.on("uncaughtException", (err) => {
  console.error("[api] Uncaught exception (non-fatal):", err);
});

startServer().catch(console.error);
