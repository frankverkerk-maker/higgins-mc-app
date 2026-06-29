#!/usr/bin/env bash
# ==============================================================================
#  Higgins Mission Control — Agent & Edition Management
#  PAN-KLAAR INSTALLATIESCRIPT  (één commando, geen handmatige stappen)
# ==============================================================================
#
#  Wat dit script doet (idempotent — veilig om vaker te draaien):
#    1. Maakt 2 nieuwe tabellen aan in de MC-database:
#         - agent_registry   : de volledige 42-agent / 12-afdeling roster
#         - edition_config    : de actieve editie (internal | whitelab)
#    2. Seedt de volledige roster met is_active + is_classified vlaggen.
#       (development = alle agents actief en geregistreerd)
#    3. Installeert een read-only feed-endpoint waarmee de slanke iPhone-app
#       de juiste agents/status/editie ophaalt:
#         GET  /api/app/team-feed          -> roster + status (editie-gefilterd)
#       en operator-endpoints voor het dashboard:
#         POST /api/mc/agent/toggle        -> agent aan/uit (operator-only)
#         POST /api/mc/edition             -> editie wisselen (operator-only)
#    4. Verifieert dat TypeScript compileert en de server draait.
#
#  GEBRUIK (op de Mac Mini, in een terminal):
#       bash install_agent_edition_mc.sh
#
#  VEREIST: het MC-project staat in MC_DIR (zie hieronder). Pas alleen die
#  variabele aan als jouw pad anders is. Verder hoef je NIETS te doen.
# ==============================================================================

set -euo pipefail

# ─── 0. Configuratie ──────────────────────────────────────────────────────────
MC_DIR="${MC_DIR:-/home/ubuntu/higgins-mission-control}"
# Operator-token beschermt de schakel-endpoints zodat klanten niets kunnen wijzigen.
# Wordt automatisch gegenereerd als hij nog niet bestaat.
OPERATOR_TOKEN_FILE="${MC_DIR}/.operator-token"

echo "==============================================================="
echo "  Higgins MC — Agent & Edition Management installatie"
echo "  Project: ${MC_DIR}"
echo "==============================================================="

if [ ! -d "${MC_DIR}" ]; then
  echo "FOUT: MC-project niet gevonden op ${MC_DIR}"
  echo "Zet MC_DIR naar het juiste pad en draai opnieuw:"
  echo "    MC_DIR=/pad/naar/higgins-mission-control bash install_agent_edition_mc.sh"
  exit 1
fi

cd "${MC_DIR}"

# ─── 1. Operator-token (genereer eenmalig) ────────────────────────────────────
if [ ! -f "${OPERATOR_TOKEN_FILE}" ]; then
  TOKEN="$(openssl rand -hex 24 2>/dev/null || head -c 24 /dev/urandom | xxd -p | tr -d '\n')"
  echo "${TOKEN}" > "${OPERATOR_TOKEN_FILE}"
  chmod 600 "${OPERATOR_TOKEN_FILE}"
  echo "[1/6] Operator-token aangemaakt: ${OPERATOR_TOKEN_FILE}"
else
  echo "[1/6] Operator-token bestaat al — ongewijzigd."
fi

# ─── 2. SQL: tabellen + seed (idempotent) ─────────────────────────────────────
# We schrijven de SQL naar een bestand en voeren die uit via de bestaande
# MC-database-CLI. Het script detecteert automatisch hoe de DB benaderd wordt.
SQL_FILE="$(mktemp /tmp/mc_agent_edition.XXXXXX.sql)"
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

-- ── Seed: 42 agents / 12 afdelingen ──────────────────────────────────────────
-- INSERT ... ON DUPLICATE KEY UPDATE => idempotent, herstelt rol/afdeling,
-- maar respecteert handmatige is_active wijzigingen NIET te overschrijven
-- (we updaten metadata, niet is_active na de eerste seed).
INSERT INTO `agent_registry`
  (`name`,`role`,`department`,`department_id`,`model`,`provider`,`team`,`reports_to`,`is_orchestrator`,`is_addon`,`is_classified`,`is_active`)
VALUES
-- 1. Higgins Mission Control
('Higgins','COO / Chief of Staff','Higgins Mission Control','higgins-mc','Claude Opus','Anthropic','directie','Frank',1,0,0,1),
('Elena','Office Manager / Receptioniste','Higgins Mission Control','higgins-mc','Claude Sonnet','Anthropic','directie','Higgins',1,0,0,1),
-- 2. Technology & Engineering
('Elon','CTO / Department Head','Technology & Engineering','engineering','Claude Sonnet','Anthropic','board','Higgins',0,0,0,1),
('Jenkins','Backend Engineer','Technology & Engineering','engineering','Claude Sonnet','Anthropic','team-elon','Elon',0,0,0,1),
('Forge','Frontend Engineer','Technology & Engineering','engineering','Claude Sonnet','Anthropic','team-elon','Elon',0,0,0,1),
('Nexus','DevOps & Infra','Technology & Engineering','engineering','Claude Sonnet','Anthropic','team-elon','Elon',0,0,0,1),
('Quinn','QA Engineer','Technology & Engineering','engineering','Claude Sonnet','Anthropic','team-elon','Elon',0,0,0,1),
('Sid','Security Engineer','Technology & Engineering','engineering','Claude Sonnet','Anthropic','team-elon','Elon',0,0,0,1),
-- 3. Gary's Marketing Department
('Gary','CMO / Department Head',"Gary's Marketing Department",'gmd','Claude Sonnet','Anthropic','board','Higgins',0,0,0,1),
('Bard','Content Creator',"Gary's Marketing Department",'gmd','Grok 3','xAI','team-gary','Gary',0,0,0,1),
('Picasso','Visual Designer',"Gary's Marketing Department",'gmd','Grok 3','xAI','team-gary','Gary',0,0,0,1),
('Echo','Social Media Manager',"Gary's Marketing Department",'gmd','Claude Sonnet','Anthropic','team-gary','Gary',0,0,0,1),
('Anna','SEO & Competitive Intelligence',"Gary's Marketing Department",'gmd','Claude Sonnet','Anthropic','team-gary','Gary',0,0,0,1),
('Larry','Viral Marketing Agent',"Gary's Marketing Department",'gmd','Claude Sonnet','Anthropic','team-gary','Gary',0,0,0,1),
('Brando','Brand Manager',"Gary's Marketing Department",'gmd','Claude Sonnet','Anthropic','team-gary','Gary',0,0,0,1),
('Flash','High-Speed Content Scaling',"Gary's Marketing Department",'gmd','Claude Sonnet','Anthropic','team-gary','Gary',0,0,0,1),
-- 4. Functional Medicine Center
('Vita','Head of Health, Safety & Wellbeing','Functional Medicine Center','fmc','Claude Sonnet','Anthropic','enterprise','Higgins',0,0,0,1),
('Sophia','Chief Medical Therapist','Functional Medicine Center','fmc','Claude Sonnet','Anthropic','fmc','Vita',0,0,0,1),
('Prof. David Sinclair','Director of Longevity Science / CSO','Functional Medicine Center','fmc',NULL,NULL,'fmc-board','Vita',0,0,0,1),
('Prof. Vladimir Khavinson','Director of Peptide Bioregulation','Functional Medicine Center','fmc',NULL,NULL,'fmc-board','Vita',0,0,0,1),
('Prof. Rosalind Franklin','Director of Molecular Diagnostics','Functional Medicine Center','fmc',NULL,NULL,'fmc-board','Vita',0,0,0,1),
('Prof. Samuel Hahnemann','Director of Integrative Medicine','Functional Medicine Center','fmc',NULL,NULL,'fmc-board','Vita',0,0,0,1),
('Prof. Maria Blasco','Director of Telomere & Cancer Research','Functional Medicine Center','fmc',NULL,NULL,'fmc-board','Vita',0,0,0,1),
-- 5. Einstein Research Lab
('Catharina','Head of Research / Chief Research Officer','Einstein Research Lab','erl','Sonar Pro','Perplexity','specialists','Higgins',0,0,0,1),
('Oracle','Market Intelligence Analyst','Einstein Research Lab','erl','Claude Sonnet','Anthropic','erl','Catharina',0,0,0,1),
('Atlas','Data Scientist','Einstein Research Lab','erl','Claude Sonnet','Anthropic','enterprise','Catharina',0,0,0,1),
-- 6. Justitia Legal Council (Add-On)
('Justitia','Head of Legal / Chief Legal Officer','Justitia Legal Council','jlc','Claude Sonnet','Anthropic','specialists','Higgins',0,1,0,1),
('Vera','Compliance Officer','Justitia Legal Council','jlc','Claude Sonnet','Anthropic','enterprise','Justitia',0,1,0,1),
-- 7. Operations & Finance
('Hugo','HR Manager','Operations & Finance','operations','Claude Sonnet','Anthropic','enterprise','Higgins',0,0,0,1),
('Oscar','Project Manager','Operations & Finance','operations','Claude Sonnet','Anthropic','enterprise','Higgins',0,0,0,1),
('Flora','Sustainability Officer','Operations & Finance','operations','Claude Sonnet','Anthropic','enterprise','Higgins',0,0,0,1),
('Mentor','Training & Development','Operations & Finance','operations','Claude Sonnet','Anthropic','enterprise','Higgins',0,0,0,1),
-- 9. Shared Services & Specialists
('WebArchitect','Website & Solution Specialist','Shared Services & Specialists','shared-services','Claude Sonnet','Anthropic','specialists','Frank',0,0,0,1),
('Barbara','Translator','Shared Services & Specialists','shared-services','Claude Sonnet','Anthropic','specialists','Higgins',0,0,0,1),
('Rosi','Community Bot','Shared Services & Specialists','shared-services','Claude Sonnet','Anthropic','community','Higgins',0,0,0,1),
-- 10. United Trust Agency (UTA) — CLASSIFIED
('Victoria','Head of Trust & Estate Planning','United Trust Agency','uta','Claude Sonnet','Anthropic','uta','Higgins',0,0,1,1),
('Justitia (UTA)','Legal Counsel (shared with JLC)','United Trust Agency','uta','Claude Sonnet','Anthropic','uta','Victoria',0,0,1,1),
-- 11. Warren Trading Desk (WTD) — CLASSIFIED
('Warren','CRO / Department Head','Warren Trading Desk','wtd','Claude Sonnet','Anthropic','board','Higgins',0,0,1,1),
('Abacus','Financial Analyst','Warren Trading Desk','wtd','Claude Sonnet','Anthropic','team-warren','Warren',0,0,1,1),
('Closer','Sales Agent','Warren Trading Desk','wtd','Claude Sonnet','Anthropic','team-warren','Warren',0,0,1,1),
('Carson','Lead Generation','Warren Trading Desk','wtd','Claude Sonnet','Anthropic','team-warren','Warren',0,0,1,1),
('Strategos','Business Strategy Architect','Warren Trading Desk','wtd','Claude Sonnet','Anthropic','team-warren','Warren',0,0,1,1)
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

-- Task Force Ghost (TFG) heeft GEEN zichtbare agents (operational security) —
-- daarom geen rijen. De afdeling wordt in de UI als classified roster getoond.
SQL

echo "[2/6] SQL-bestand gegenereerd."

# ─── 3. SQL uitvoeren via de juiste MC-database-CLI (auto-detect) ─────────────
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
  # Voorkeur 3: losse MYSQL_* variabelen
  if [ -n "${MYSQL_HOST:-}" ] && command -v mysql >/dev/null 2>&1; then
    echo "      -> via mysql client (MYSQL_* env)"
    mysql -h "${MYSQL_HOST}" -P "${MYSQL_PORT:-3306}" -u "${MYSQL_USER:-root}" \
      ${MYSQL_PASSWORD:+-p"${MYSQL_PASSWORD}"} "${MYSQL_DATABASE:-higgins_mc}" < "${sql_path}"
    return
  fi
  echo "WAARSCHUWING: geen database-CLI gevonden."
  echo "Voer dit SQL-bestand handmatig uit in de MC-database: ${sql_path}"
  echo "(Daarna is de installatie compleet — de rest is al geplaatst.)"
}

echo "[3/6] SQL uitvoeren op de MC-database..."
run_sql "${SQL_FILE}" || {
  echo "Let op: SQL-uitvoer gaf een waarschuwing; controleer bovenstaande melding."
}

# ─── 4. Server-route plaatsen (read-only feed + operator-schakelaars) ─────────
ROUTE_DIR="${MC_DIR}/server/routes"
mkdir -p "${ROUTE_DIR}"
ROUTE_FILE="${ROUTE_DIR}/agent-edition.ts"

cat > "${ROUTE_FILE}" <<'TS'
// AUTO-GEGENEREERD door install_agent_edition_mc.sh
// Agent & Edition feed + operator-schakelaars voor Higgins MC.
//
// Koppel deze router aan je Express/tRPC server. Voor een kale Express-app:
//   import { registerAgentEditionRoutes } from "./routes/agent-edition";
//   registerAgentEditionRoutes(app, db);
//
// `db` moet een query(sql, params) -> Promise<rows> aanbieden (mysql2/promise pool).
import type { Express, Request, Response } from "express";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function readOperatorToken(mcDir: string): string {
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

# ─── 5. Drizzle-schema aanvullen (handmatige introspectie wordt vermeden) ─────
SCHEMA_FILE="${MC_DIR}/drizzle/schema.ts"
if [ -f "${SCHEMA_FILE}" ] && ! grep -q "agent_registry" "${SCHEMA_FILE}"; then
  cat >> "${SCHEMA_FILE}" <<'TS'

// ── Agent & Edition Management (toegevoegd door install_agent_edition_mc.sh) ──
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
echo "  KLAAR. Agent & Edition Management is geïnstalleerd."
echo ""
echo "  Volgende (eenmalige) handeling in je server-opstart:"
echo "    import { registerAgentEditionRoutes } from \"./routes/agent-edition\";"
echo "    registerAgentEditionRoutes(app, db);   // db = mysql2 pool"
echo ""
echo "  De iPhone-app haalt voortaan op:  GET /api/app/team-feed"
echo "  Operator-schakelaars (dashboard):"
echo "    POST /api/mc/agent/toggle   { name, isActive }   + header x-operator-token"
echo "    POST /api/mc/edition        { edition }          + header x-operator-token"
echo ""
echo "  Operator-token staat in: ${OPERATOR_TOKEN_FILE}"
echo "==============================================================="
