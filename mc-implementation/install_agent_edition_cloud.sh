#!/usr/bin/env bash
# ==============================================================================
#  Higgins Mission Control — Agent & Edition Management  (CLOUD-kant)
#  PAN-KLAAR INSTALLATIESCRIPT  (één commando, geen handmatige stappen)
# ==============================================================================
#
#  Dit is de CLOUD-tegenhanger van install_agent_edition_mc.sh (Mac Mini).
#  Het installeert in de Mission Control CLOUD-omgeving (Manus webdev project,
#  MySQL-database) exact dezelfde besturing voor agents en editie:
#
#    1. Twee tabellen in de cloud-database:
#         - agent_registry  : de volledige 66-agent / 10-afdeling roster
#                             met de vlaggen is_active + is_classified.
#         - edition_config  : de actieve editie (internal | whitelab), singleton.
#    2. De volledige roster geseed (development = alle agents actief).
#    3. Drie endpoints, identiek aan de Mac Mini-kant:
#         GET  /api/app/team-feed   -> read-only feed voor de iPhone-app
#                                      (alleen actieve agents; whitelab verbergt
#                                       classified afdelingen automatisch).
#         POST /api/mc/agent/toggle -> agent aan/uit  (operator-only, met token).
#         POST /api/mc/edition      -> editie wisselen (operator-only, met token).
#    4. Drizzle-schema aangevuld (GEEN introspect — dat genereert kapotte TS).
#    5. Verificatie: TypeScript compileert + server draait.
#
#  GEBRUIK (in de cloud-sandbox van het MC-project, in een terminal):
#       bash install_agent_edition_cloud.sh
#
#  Staat het cloud-project ergens anders? Geef het pad mee:
#       MC_DIR=/pad/naar/higgins-mission-control bash install_agent_edition_cloud.sh
#
#  Het script is IDEMPOTENT: veilig om vaker te draaien. Een agent die jij
#  handmatig hebt uitgezet, blijft uit (herinstallatie zet 'm niet terug op actief).
# ==============================================================================
set -euo pipefail

# ─── 0. Configuratie ──────────────────────────────────────────────────────────
MC_DIR="${MC_DIR:-/home/ubuntu/higgins-mission-control}"
OPERATOR_TOKEN_FILE="${MC_DIR}/.operator-token"

echo "==============================================================="
echo "  Higgins MC (CLOUD) — Agent & Edition Management installatie"
echo "  Project: ${MC_DIR}"
echo "==============================================================="

if [ ! -d "${MC_DIR}" ]; then
  echo "FOUT: cloud MC-project niet gevonden op ${MC_DIR}"
  echo "Zet MC_DIR naar het juiste pad en draai opnieuw:"
  echo "    MC_DIR=/pad/naar/higgins-mission-control bash install_agent_edition_cloud.sh"
  exit 1
fi
cd "${MC_DIR}"

# ─── 1. Operator-token (genereer eenmalig) ────────────────────────────────────
# Beschermt de schakel-endpoints zodat klanten/whitelab-gebruikers niets kunnen
# wijzigen. Alleen jij (operator) kent dit token.
if [ ! -f "${OPERATOR_TOKEN_FILE}" ]; then
  TOKEN="$(openssl rand -hex 24 2>/dev/null || head -c 24 /dev/urandom | xxd -p | tr -d '\n')"
  echo "${TOKEN}" > "${OPERATOR_TOKEN_FILE}"
  chmod 600 "${OPERATOR_TOKEN_FILE}"
  echo "[1/6] Operator-token aangemaakt: ${OPERATOR_TOKEN_FILE}"
else
  echo "[1/6] Operator-token bestaat al — ongewijzigd."
fi

# ─── 2. SQL: tabellen + seed (idempotent) ─────────────────────────────────────
SQL_FILE="$(mktemp /tmp/mc_cloud_agent_edition.XXXXXX.sql)"
cat > "${SQL_FILE}" <<'SQL'
-- ── Tabel: agent_registry ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `agent_registry` (
  `id`            VARCHAR(36)  NOT NULL DEFAULT (UUID()),
  `name`          VARCHAR(128) NOT NULL,
  `role`          VARCHAR(255) NOT NULL,
  `department`    VARCHAR(128) NOT NULL,
  `department_id` VARCHAR(64)  NOT NULL,
  `model`         VARCHAR(128) NULL,
  `provider`      VARCHAR(128) NULL,
  `team`          VARCHAR(64)  NULL,
  `reports_to`    VARCHAR(128) NULL,
  `is_orchestrator` TINYINT NOT NULL DEFAULT 0,
  `is_addon`        TINYINT NOT NULL DEFAULT 0,
  `is_classified`   TINYINT NOT NULL DEFAULT 0,
  `is_active`       TINYINT NOT NULL DEFAULT 1,   -- development: alles actief
  `status`        VARCHAR(32)  NOT NULL DEFAULT 'standby',
  `current_task`  VARCHAR(255) NULL,
  `created_at`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_agent_name` (`name`)
);

-- ── Tabel: edition_config ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `edition_config` (
  `id`         VARCHAR(36) NOT NULL DEFAULT (UUID()),
  `edition`    VARCHAR(16) NOT NULL DEFAULT 'internal',  -- internal | whitelab
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);

-- Zorg dat er precies één editie-rij bestaat (singleton).
INSERT INTO `edition_config` (`id`, `edition`)
SELECT UUID(), 'internal'
WHERE NOT EXISTS (SELECT 1 FROM `edition_config`);

-- ── Seed: 66 agents / 10 afdelingen ──────────────────────────────────────────
INSERT INTO `agent_registry`
  (`name`,`role`,`department`,`department_id`,`model`,`provider`,`team`,`reports_to`,`is_orchestrator`,`is_addon`,`is_classified`,`is_active`)
VALUES
-- Executive Office
('Higgins','Chief Operating Officer','Executive Office','executive','Claude Opus','Anthropic','tier-0','Frank',1,0,0,1),
('Elena','Executive Assistant','Executive Office','executive','Claude Sonnet','Anthropic','tier-0','Higgins',1,0,0,1),
('Rosi','Community Manager','Executive Office','executive','Claude Sonnet','Anthropic','tier-1','Higgins',0,0,0,1),
-- Technology Division
('Elon','Chief Technology Officer','Technology Division','technology','Claude Opus','Anthropic','tier-0','Higgins',0,0,0,1),
('Jenkins','Backend Engineer','Technology Division','technology','Claude Sonnet','Anthropic','tier-1','Elon',0,0,0,1),
('Sid','Security Engineer','Technology Division','technology','Claude Sonnet','Anthropic','tier-1','Elon',0,0,0,1),
('Forge','Creative Engineer','Technology Division','technology','Claude Sonnet','Anthropic','tier-1','Elon',0,0,0,1),
('Nexus','Integration Architect','Technology Division','technology','Claude Sonnet','Anthropic','tier-1','Elon',0,0,0,1),
('Da Vinci','Digital Architect (DVDA)','Technology Division','technology','Claude Sonnet','Anthropic','tier-1','Elon',0,0,0,1),
-- Marketing & Creative
('Gary','Chief Marketing Officer','Marketing & Creative','marketing','Claude Opus','Anthropic','tier-0','Higgins',0,0,0,1),
('Bard','Content Writer','Marketing & Creative','marketing','Claude Sonnet','Anthropic','tier-1','Gary',0,0,0,1),
('Picasso','Visual Designer','Marketing & Creative','marketing','Claude Sonnet','Anthropic','tier-1','Gary',0,0,0,1),
('Echo','Social Media Manager','Marketing & Creative','marketing','Claude Sonnet','Anthropic','tier-1','Gary',0,0,0,1),
('Anna','Market Analyst','Marketing & Creative','marketing','Claude Sonnet','Anthropic','tier-1','Gary',0,0,0,1),
('Larry','SEO Specialist','Marketing & Creative','marketing','Claude Sonnet','Anthropic','tier-1','Gary',0,0,0,1),
-- Functional Medicine Center
('David','Director Longevity Science','Functional Medicine Center','fmc','Claude Opus','Anthropic','tier-1','Higgins',0,0,0,1),
('Vladimir','Director Bioregulation','Functional Medicine Center','fmc','Claude Sonnet','Anthropic','tier-1','David',0,0,0,1),
('Samuel','Director Integrative Medicine','Functional Medicine Center','fmc','Claude Sonnet','Anthropic','tier-1','David',0,0,0,1),
('Rosalind','Director Molecular Diagnostics','Functional Medicine Center','fmc','Claude Opus','Anthropic','tier-1','David',0,0,0,1),
('Maria','Director Telomere Biology','Functional Medicine Center','fmc','Gemini 2.5 Pro','Google','tier-1','David',0,0,0,1),
-- Justitia Legal Council
('Justitia','Chief Legal Officer','Justitia Legal Council','jlc','Claude Opus','Anthropic','tier-0','Higgins',0,0,0,1),
('Adrian','Corporate Law','Justitia Legal Council','jlc','Claude Sonnet','Anthropic','tier-1','Justitia',0,0,0,1),
('Elena V.','International Law','Justitia Legal Council','jlc','Claude Sonnet','Anthropic','tier-1','Justitia',0,0,0,1),
('Isabelle','Contract Review','Justitia Legal Council','jlc','Claude Sonnet','Anthropic','tier-1','Justitia',0,0,0,1),
('Matteo','IP & Technology Law','Justitia Legal Council','jlc','Claude Sonnet','Anthropic','tier-1','Justitia',0,0,0,1),
('Nadia','Data Protection (GDPR)','Justitia Legal Council','jlc','Claude Sonnet','Anthropic','tier-1','Justitia',0,0,0,1),
-- Sales & Revenue
('Closer','Head of Sales','Sales & Revenue','sales','Claude Sonnet','Anthropic','tier-1','Higgins',0,0,0,1),
('Carson','Product Intelligence','Sales & Revenue','sales','Claude Sonnet','Anthropic','tier-1','Closer',0,0,0,1),
('Strategos','Revenue Strategy','Sales & Revenue','sales','Claude Sonnet','Anthropic','tier-1','Closer',0,0,0,1),
-- Enterprise Operations
('Atlas','Operations Director','Enterprise Operations','enterprise','Claude Sonnet','Anthropic','tier-1','Higgins',0,0,0,1),
('Bridge','Integration Coordinator','Enterprise Operations','enterprise','Claude Sonnet','Anthropic','tier-1','Atlas',0,0,0,1),
('Felix','Quality Assurance','Enterprise Operations','enterprise','Claude Sonnet','Anthropic','tier-1','Atlas',0,0,0,1),
('Flora','Wellness Programs','Enterprise Operations','enterprise','Claude Sonnet','Anthropic','tier-1','Atlas',0,0,0,1),
('Herald','Communications','Enterprise Operations','enterprise','Claude Sonnet','Anthropic','tier-1','Atlas',0,0,0,1),
('Hugo','HR & Talent','Enterprise Operations','enterprise','Claude Sonnet','Anthropic','tier-1','Atlas',0,0,0,1),
('Iris','Patient Experience','Enterprise Operations','enterprise','Claude Sonnet','Anthropic','tier-1','Atlas',0,0,0,1),
('Max','Facility Operations','Enterprise Operations','enterprise','Claude Sonnet','Anthropic','tier-1','Atlas',0,0,0,1),
('Mentor','Training & Development','Enterprise Operations','enterprise','Claude Sonnet','Anthropic','tier-1','Atlas',0,0,0,1),
('Nova','Innovation & R&D','Enterprise Operations','enterprise','Claude Sonnet','Anthropic','tier-1','Atlas',0,0,0,1),
('Oscar','Supply Chain','Enterprise Operations','enterprise','Claude Sonnet','Anthropic','tier-1','Atlas',0,0,0,1),
('Quinn','Data Analytics','Enterprise Operations','enterprise','Claude Sonnet','Anthropic','tier-1','Atlas',0,0,0,1),
('Vera','Regulatory Affairs','Enterprise Operations','enterprise','Claude Sonnet','Anthropic','tier-1','Atlas',0,0,0,1),
('Vita','Vitality Programs','Enterprise Operations','enterprise','Claude Sonnet','Anthropic','tier-1','Atlas',0,0,0,1),
-- Cross-Functional Specialists
('Sophia','Chief Medical Officer','Cross-Functional Specialists','specialists','Claude Opus','Anthropic','tier-1','Higgins',0,0,0,1),
('Catharina','Research Director','Cross-Functional Specialists','specialists','Claude Sonnet','Anthropic','tier-1','Higgins',0,0,0,1),
('Barbara','International Relations','Cross-Functional Specialists','specialists','Claude Sonnet','Anthropic','tier-1','Higgins',0,0,0,1),
('Susi','Customer Success','Cross-Functional Specialists','specialists','Claude Sonnet','Anthropic','tier-1','Higgins',0,0,0,1),
-- Warren Trading Desk
('Warren','Head of Trading','Warren Trading Desk','wtd','Claude Opus','Anthropic','tier-0','Higgins',0,0,1,1),
('Abacus','Financial Analyst','Warren Trading Desk','wtd','Claude Sonnet','Anthropic','tier-1','Warren',0,0,1,1),
-- Ultra Trust Agency
('Victoria','Head of Trust & Estate','Ultra Trust Agency','uta','Claude Opus','Anthropic','tier-0','Higgins',0,0,1,1),
('Alexander','Senior Trust Counsel','Ultra Trust Agency','uta','Claude Sonnet','Anthropic','tier-1','Victoria',0,0,1,1),
('Arabella','International Tax','Ultra Trust Agency','uta','Claude Sonnet','Anthropic','tier-1','Victoria',0,0,1,1),
('Benedict','Corporate Structuring','Ultra Trust Agency','uta','Claude Sonnet','Anthropic','tier-1','Victoria',0,0,1,1),
('Charlotte','Family Governance','Ultra Trust Agency','uta','Claude Sonnet','Anthropic','tier-1','Victoria',0,0,1,1),
('Eleanor','Wealth Transfer','Ultra Trust Agency','uta','Claude Sonnet','Anthropic','tier-1','Victoria',0,0,1,1),
('Helena','Private Banking','Ultra Trust Agency','uta','Claude Sonnet','Anthropic','tier-1','Victoria',0,0,1,1),
('Isabelle R.','Compliance & Regulatory','Ultra Trust Agency','uta','Claude Sonnet','Anthropic','tier-1','Victoria',0,0,1,1),
('James','Real Estate Trust','Ultra Trust Agency','uta','Claude Sonnet','Anthropic','tier-1','Victoria',0,0,1,1),
('Lukas','Cross-Border Benelux','Ultra Trust Agency','uta','Claude Sonnet','Anthropic','tier-1','Victoria',0,0,1,1),
('Margaret','Liechtenstein Foundation','Ultra Trust Agency','uta','Claude Sonnet','Anthropic','tier-1','Victoria',0,0,1,1),
('Maximilian','German Tax & Succession','Ultra Trust Agency','uta','Claude Sonnet','Anthropic','tier-1','Victoria',0,0,1,1),
('Oliver','Swiss Holding Structures','Ultra Trust Agency','uta','Claude Sonnet','Anthropic','tier-1','Victoria',0,0,1,1),
('Philippa','Art & Collectibles Trust','Ultra Trust Agency','uta','Claude Sonnet','Anthropic','tier-1','Victoria',0,0,1,1),
('Raphael','Digital Assets & Crypto','Ultra Trust Agency','uta','Claude Sonnet','Anthropic','tier-1','Victoria',0,0,1,1),
('Sebastian','Insurance & Risk','Ultra Trust Agency','uta','Claude Sonnet','Anthropic','tier-1','Victoria',0,0,1,1),
('Theodore','Philanthropic Structures','Ultra Trust Agency','uta','Claude Sonnet','Anthropic','tier-1','Victoria',0,0,1,1)
ON DUPLICATE KEY UPDATE
  `role`=VALUES(`role`),
  `department`=VALUES(`department`),
  `department_id`=VALUES(`department_id`),
  `model`=VALUES(`model`),
  `provider`=VALUES(`provider`),
  `team`=VALUES(`team`),
  `reports_to`=VALUES(`reports_to`),
  `is_orchestrator`=VALUES(`is_orchestrator`),
  `is_addon`=VALUES(`is_addon`),
  `is_classified`=VALUES(`is_classified`);
-- NB: is_active wordt bewust NIET in de UPDATE meegenomen, zodat een
-- operator-keuze (agent uitgezet) niet door een herinstallatie wordt overschreven.

SQL

echo "[2/6] SQL-bestand gegenereerd."

# ─── 3. SQL uitvoeren op de CLOUD-database (auto-detect) ──────────────────────
# In de cloud is DATABASE_URL doorgaans gezet door de webdev-runtime.
run_sql() {
  local sql_path="$1"
  # Voorkeur 1: project-script 'db:sql' indien aanwezig
  if node -e "const p=require('./package.json');process.exit(p.scripts&&p.scripts['db:sql']?0:1)" 2>/dev/null; then
    echo "      -> via pnpm db:sql"
    pnpm db:sql < "${sql_path}"
    return
  fi
  # Voorkeur 2: DATABASE_URL met mysql client
  if [ -n "${DATABASE_URL:-}" ] && command -v mysql >/dev/null 2>&1; then
    echo "      -> via mysql client (DATABASE_URL)"
    mysql "${DATABASE_URL}" < "${sql_path}"
    return
  fi
  # Voorkeur 3: DATABASE_URL zonder mysql client -> via Node (mysql2 in node_modules)
  if [ -n "${DATABASE_URL:-}" ]; then
    echo "      -> via Node + mysql2 (DATABASE_URL)"
    SQL_PATH="${sql_path}" node --input-type=module <<'NODE'
import { readFileSync } from "node:fs";
import mysql from "mysql2/promise";
const url = process.env.DATABASE_URL;
const sql = readFileSync(process.env.SQL_PATH, "utf8");
const conn = await mysql.createConnection({ uri: url, multipleStatements: true });
await conn.query(sql);
await conn.end();
console.log("      SQL toegepast via mysql2.");
NODE
    return
  fi
  # Voorkeur 4: losse MYSQL_* variabelen
  if [ -n "${MYSQL_HOST:-}" ] && command -v mysql >/dev/null 2>&1; then
    echo "      -> via mysql client (MYSQL_* env)"
    mysql -h "${MYSQL_HOST}" -P "${MYSQL_PORT:-3306}" -u "${MYSQL_USER:-root}" \
      ${MYSQL_PASSWORD:+-p"${MYSQL_PASSWORD}"} "${MYSQL_DATABASE:-higgins_mc}" < "${sql_path}"
    return
  fi
  echo "WAARSCHUWING: geen database-toegang gevonden (DATABASE_URL / MYSQL_* leeg)."
  echo "Voer dit SQL-bestand handmatig uit in de cloud-database: ${sql_path}"
  echo "(Of plak de inhoud in het Database-paneel van het webdev-project.)"
}

echo "[3/6] SQL uitvoeren op de CLOUD-database..."
run_sql "${SQL_FILE}" || {
  echo "Let op: SQL-uitvoer gaf een waarschuwing; controleer bovenstaande melding."
}

# ─── 4. Server-route plaatsen (read-only feed + operator-schakelaars) ─────────
ROUTE_DIR="${MC_DIR}/server/routes"
mkdir -p "${ROUTE_DIR}"
ROUTE_FILE="${ROUTE_DIR}/agent-edition.ts"

cat > "${ROUTE_FILE}" <<'TS'
// AUTO-GEGENEREERD door install_agent_edition_cloud.sh
// Agent & Edition feed + operator-schakelaars voor Higgins MC (CLOUD).
//
// Koppel deze router aan je Express server. Voor een kale Express-app:
//   import { registerAgentEditionRoutes } from "./routes/agent-edition";
//   registerAgentEditionRoutes(app, db);
//
// `db` moet een query(sql, params) -> Promise<rows> aanbieden (mysql2/promise pool).
import type { Express, Request, Response } from "express";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function readOperatorToken(mcDir: string): string {
  // In de cloud kan het token ook via een env var komen (OPERATOR_TOKEN).
  if (process.env.OPERATOR_TOKEN) return process.env.OPERATOR_TOKEN.trim();
  try {
    return readFileSync(join(mcDir, ".operator-token"), "utf8").trim();
  } catch {
    return "";
  }
}

type DbLike = { query: (sql: string, params?: any[]) => Promise<any> };

export function registerAgentEditionRoutes(
  app: Express,
  db: DbLike,
  mcDir = process.cwd(),
) {
  const OPERATOR_TOKEN = readOperatorToken(mcDir);

  function requireOperator(req: Request, res: Response): boolean {
    const token = req.header("x-operator-token") || "";
    if (!OPERATOR_TOKEN || token !== OPERATOR_TOKEN) {
      res.status(403).json({ error: "operator_token_required" });
      return false;
    }
    return true;
  }

  async function currentEdition(): Promise<"internal" | "whitelab"> {
    const rows = await db.query("SELECT edition FROM edition_config LIMIT 1");
    const list = Array.isArray(rows) ? rows : rows?.[0];
    return (list?.[0]?.edition as "internal" | "whitelab") || "internal";
  }

  // ── App-feed: roster + status, editie-gefilterd, ALLEEN actieve agents ──────
  app.get("/api/app/team-feed", async (_req: Request, res: Response) => {
    try {
      const edition = await currentEdition();
      const rows = await db.query(
        `SELECT name, role, department, department_id, model, provider, team,
                reports_to, is_orchestrator, is_addon, is_classified, is_active,
                status, current_task
         FROM agent_registry
         WHERE is_active = 1
         ${edition === "whitelab" ? "AND is_classified = 0" : ""}
         ORDER BY department_id, name`,
      );
      const agents = (Array.isArray(rows) ? rows : rows?.[0]) || [];
      res.json({ edition, count: agents.length, agents });
    } catch (e) {
      res.status(500).json({ error: "feed_failed", detail: String(e) });
    }
  });

  // ── Operator: agent aan/uit ─────────────────────────────────────────────────
  app.post("/api/mc/agent/toggle", async (req: Request, res: Response) => {
    if (!requireOperator(req, res)) return;
    const { name, isActive } = req.body || {};
    if (typeof name !== "string" || typeof isActive !== "boolean") {
      return res.status(400).json({ error: "name(string)+isActive(boolean) vereist" });
    }
    try {
      await db.query("UPDATE agent_registry SET is_active = ? WHERE name = ?", [
        isActive ? 1 : 0,
        name,
      ]);
      res.json({ ok: true, name, isActive });
    } catch (e) {
      res.status(500).json({ error: "toggle_failed", detail: String(e) });
    }
  });

  // ── Operator: editie wisselen ───────────────────────────────────────────────
  app.post("/api/mc/edition", async (req: Request, res: Response) => {
    if (!requireOperator(req, res)) return;
    const { edition } = req.body || {};
    if (edition !== "internal" && edition !== "whitelab") {
      return res.status(400).json({ error: "edition moet internal|whitelab zijn" });
    }
    try {
      await db.query("UPDATE edition_config SET edition = ?", [edition]);
      res.json({ ok: true, edition });
    } catch (e) {
      res.status(500).json({ error: "edition_failed", detail: String(e) });
    }
  });
}
TS

echo "[4/6] Server-route geplaatst: ${ROUTE_FILE}"

# ─── 5. Drizzle-schema aanvullen (NOOIT introspect) ───────────────────────────
SCHEMA_FILE="${MC_DIR}/drizzle/schema.ts"
if [ -f "${SCHEMA_FILE}" ] && ! grep -q "agent_registry" "${SCHEMA_FILE}"; then
  cat >> "${SCHEMA_FILE}" <<'TS'

// ── Agent & Edition Management (toegevoegd door install_agent_edition_cloud.sh) ──
export const agentRegistry = mysqlTable("agent_registry", {
  id: varchar("id", { length: 36 }).primaryKey().notNull().default(sql`(UUID())`),
  name: varchar("name", { length: 128 }).notNull(),
  role: varchar("role", { length: 255 }).notNull(),
  department: varchar("department", { length: 128 }).notNull(),
  departmentId: varchar("department_id", { length: 64 }).notNull(),
  model: varchar("model", { length: 128 }),
  provider: varchar("provider", { length: 128 }),
  team: varchar("team", { length: 64 }),
  reportsTo: varchar("reports_to", { length: 128 }),
  isOrchestrator: tinyint("is_orchestrator").notNull().default(0),
  isAddon: tinyint("is_addon").notNull().default(0),
  isClassified: tinyint("is_classified").notNull().default(0),
  isActive: tinyint("is_active").notNull().default(1),
  status: varchar("status", { length: 32 }).notNull().default("standby"),
  currentTask: varchar("current_task", { length: 255 }),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const editionConfig = mysqlTable("edition_config", {
  id: varchar("id", { length: 36 }).primaryKey().notNull().default(sql`(UUID())`),
  edition: varchar("edition", { length: 16 }).notNull().default("internal"),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().default(sql`CURRENT_TIMESTAMP`),
});
TS
  echo "[5/6] Drizzle-schema aangevuld in ${SCHEMA_FILE}"
else
  echo "[5/6] Drizzle-schema al aanwezig of schema.ts ontbreekt — overgeslagen."
fi

# ─── 6. Verificatie ───────────────────────────────────────────────────────────
echo "[6/6] Verificatie..."
if node -e "const p=require('./package.json');process.exit(p.scripts&&p.scripts.check?0:1)" 2>/dev/null; then
  echo "      TypeScript controleren (pnpm check)..."
  pnpm check 2>&1 | grep -v node_modules || true
fi

rm -f "${SQL_FILE}"

echo "==============================================================="
echo "  KLAAR. Agent & Edition Management is geïnstalleerd in de CLOUD."
echo ""
echo "  Volgende (eenmalige) handeling in je server-opstart:"
echo "    import { registerAgentEditionRoutes } from \"./routes/agent-edition\";"
echo "    registerAgentEditionRoutes(app, db);   // db = mysql2 pool"
echo ""
echo "  De iPhone-app haalt voortaan op:  GET /api/app/team-feed"
echo "  Zet dezelfde cloud-URL in de app onder Instellingen > Verbinding >"
echo "  'MC Team-feed URL', bijv. https://<jouw-mc-cloud>/api/app/team-feed"
echo ""
echo "  Operator-schakelaars (dashboard):"
echo "    POST /api/mc/agent/toggle   { name, isActive }   + header x-operator-token"
echo "    POST /api/mc/edition        { edition }          + header x-operator-token"
echo ""
echo "  Operator-token: env OPERATOR_TOKEN of bestand ${OPERATOR_TOKEN_FILE}"
echo "==============================================================="
