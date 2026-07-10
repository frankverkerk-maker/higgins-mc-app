# Higgins MC Cloud — Implementatiescript

Dit document bevat **één enkel script** dat je kopieert en uitvoert in de terminal van je Higgins Mission Control Cloud-project. Het doet alles automatisch:

- Maakt de benodigde database-tabellen aan (als ze nog niet bestaan)
- Vult het volledige team in (66 agenten, 10 afdelingen)
- Plaatst de server-routes zodat de iPhone-app kan communiceren
- Genereert een beveiligingstoken zodat alleen jij agents kunt aan/uitzetten
- Werkt het Drizzle-schema bij

---

## Hoe te gebruiken

**Stap 1:** Open een terminal in je Higgins Mission Control Cloud-project.

**Stap 2:** Kopieer het volledige scriptblok hieronder en plak het in de terminal.

**Stap 3:** Druk op Enter. Klaar.

---

## Het Script

```bash
#!/usr/bin/env bash
# ==============================================================================
#  Higgins Mission Control — Volledige Installatie (CLOUD)
#  Kopieer dit hele blok en plak het in de terminal van je MC Cloud-project.
# ==============================================================================
set -euo pipefail

MC_DIR="${MC_DIR:-$(pwd)}"
echo ""
echo "======================================================="
echo "  Higgins MC Cloud — Installatie gestart"
echo "  Project: ${MC_DIR}"
echo "======================================================="
echo ""

cd "${MC_DIR}"

# ─── 1. Beveiligingstoken aanmaken ────────────────────────────────────────────
# Dit token beschermt de schakel-endpoints. Alleen jij kent het.
if [ ! -f ".operator-token" ]; then
  TOKEN="$(openssl rand -hex 24 2>/dev/null || head -c 24 /dev/urandom | xxd -p | tr -d '\n')"
  echo "${TOKEN}" > ".operator-token"
  chmod 600 ".operator-token"
  echo "[1/5] Beveiligingstoken aangemaakt (.operator-token)"
  echo "      Bewaar dit token: ${TOKEN}"
else
  echo "[1/5] Beveiligingstoken bestaat al — ongewijzigd."
fi

# ─── 2. Database-tabellen en teamroster ───────────────────────────────────────
SQL_FILE="$(mktemp /tmp/mc_install.XXXXXX.sql)"
cat > "${SQL_FILE}" <<'SQL'
-- Tabel voor alle agenten
CREATE TABLE IF NOT EXISTS `agent_registry` (
  `id`              VARCHAR(36)  NOT NULL DEFAULT (UUID()),
  `name`            VARCHAR(128) NOT NULL,
  `role`            VARCHAR(255) NOT NULL,
  `department`      VARCHAR(128) NOT NULL,
  `department_id`   VARCHAR(64)  NOT NULL,
  `model`           VARCHAR(128) NULL,
  `provider`        VARCHAR(128) NULL,
  `team`            VARCHAR(64)  NULL,
  `reports_to`      VARCHAR(128) NULL,
  `is_orchestrator` TINYINT NOT NULL DEFAULT 0,
  `is_addon`        TINYINT NOT NULL DEFAULT 0,
  `is_classified`   TINYINT NOT NULL DEFAULT 0,
  `is_active`       TINYINT NOT NULL DEFAULT 1,
  `status`          VARCHAR(32)  NOT NULL DEFAULT 'standby',
  `current_task`    VARCHAR(255) NULL,
  `created_at`      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_agent_name` (`name`)
);

-- Tabel voor de editie-instelling (internal of whitelab)
CREATE TABLE IF NOT EXISTS `edition_config` (
  `id`         VARCHAR(36) NOT NULL DEFAULT (UUID()),
  `edition`    VARCHAR(16) NOT NULL DEFAULT 'internal',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);

-- Zorg dat er precies één editie-rij bestaat
INSERT INTO `edition_config` (`id`, `edition`)
SELECT UUID(), 'internal'
WHERE NOT EXISTS (SELECT 1 FROM `edition_config`);

-- Het volledige team (66 agenten, 10 afdelingen)
INSERT INTO `agent_registry`
  (`name`,`role`,`department`,`department_id`,`model`,`provider`,`team`,`reports_to`,`is_orchestrator`,`is_addon`,`is_classified`,`is_active`)
VALUES
-- Executive Office (3)
('Higgins','Chief Operating Officer','Executive Office','executive','Claude Opus','Anthropic','tier-0','Frank',1,0,0,1),
('Elena','Executive Assistant','Executive Office','executive','Claude Sonnet','Anthropic','tier-0','Higgins',1,0,0,1),
('Rosi','Community Manager','Executive Office','executive','Claude Sonnet','Anthropic','tier-1','Higgins',0,0,0,1),
-- Technology Division (6)
('Elon','Chief Technology Officer','Technology Division','technology','Claude Opus','Anthropic','tier-0','Higgins',0,0,0,1),
('Jenkins','Backend Engineer','Technology Division','technology','Claude Sonnet','Anthropic','tier-1','Elon',0,0,0,1),
('Sid','Security Engineer','Technology Division','technology','Claude Sonnet','Anthropic','tier-1','Elon',0,0,0,1),
('Forge','Creative Engineer','Technology Division','technology','Claude Sonnet','Anthropic','tier-1','Elon',0,0,0,1),
('Nexus','Integration Architect','Technology Division','technology','Claude Sonnet','Anthropic','tier-1','Elon',0,0,0,1),
('Da Vinci','Digital Architect (DVDA)','Technology Division','technology','Claude Sonnet','Anthropic','tier-1','Elon',0,0,0,1),
-- Marketing & Creative (6)
('Gary','Chief Marketing Officer','Marketing & Creative','marketing','Claude Opus','Anthropic','tier-0','Higgins',0,0,0,1),
('Bard','Content Writer','Marketing & Creative','marketing','Claude Sonnet','Anthropic','tier-1','Gary',0,0,0,1),
('Picasso','Visual Designer','Marketing & Creative','marketing','Claude Sonnet','Anthropic','tier-1','Gary',0,0,0,1),
('Echo','Social Media Manager','Marketing & Creative','marketing','Claude Sonnet','Anthropic','tier-1','Gary',0,0,0,1),
('Anna','Market Analyst','Marketing & Creative','marketing','Claude Sonnet','Anthropic','tier-1','Gary',0,0,0,1),
('Larry','SEO Specialist','Marketing & Creative','marketing','Claude Sonnet','Anthropic','tier-1','Gary',0,0,0,1),
-- Functional Medicine Center (5)
('David','Director Longevity Science','Functional Medicine Center','fmc','Claude Opus','Anthropic','tier-1','Higgins',0,0,0,1),
('Vladimir','Director Bioregulation','Functional Medicine Center','fmc','Claude Sonnet','Anthropic','tier-1','David',0,0,0,1),
('Samuel','Director Integrative Medicine','Functional Medicine Center','fmc','Claude Sonnet','Anthropic','tier-1','David',0,0,0,1),
('Rosalind','Director Molecular Diagnostics','Functional Medicine Center','fmc','Claude Opus','Anthropic','tier-1','David',0,0,0,1),
('Maria','Director Telomere Biology','Functional Medicine Center','fmc','Gemini 2.5 Pro','Google','tier-1','David',0,0,0,1),
-- Justitia Legal Council (6)
('Justitia','Chief Legal Officer','Justitia Legal Council','jlc','Claude Opus','Anthropic','tier-0','Higgins',0,0,0,1),
('Adrian','Corporate Law','Justitia Legal Council','jlc','Claude Sonnet','Anthropic','tier-1','Justitia',0,0,0,1),
('Elena V.','International Law','Justitia Legal Council','jlc','Claude Sonnet','Anthropic','tier-1','Justitia',0,0,0,1),
('Isabelle','Contract Review','Justitia Legal Council','jlc','Claude Sonnet','Anthropic','tier-1','Justitia',0,0,0,1),
('Matteo','IP & Technology Law','Justitia Legal Council','jlc','Claude Sonnet','Anthropic','tier-1','Justitia',0,0,0,1),
('Nadia','Data Protection (GDPR)','Justitia Legal Council','jlc','Claude Sonnet','Anthropic','tier-1','Justitia',0,0,0,1),
-- Sales & Revenue (3)
('Closer','Head of Sales','Sales & Revenue','sales','Claude Sonnet','Anthropic','tier-1','Higgins',0,0,0,1),
('Carson','Product Intelligence','Sales & Revenue','sales','Claude Sonnet','Anthropic','tier-1','Closer',0,0,0,1),
('Strategos','Revenue Strategy','Sales & Revenue','sales','Claude Sonnet','Anthropic','tier-1','Closer',0,0,0,1),
-- Enterprise Operations (14)
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
-- Cross-Functional Specialists (4)
('Sophia','Chief Medical Officer','Cross-Functional Specialists','specialists','Claude Opus','Anthropic','tier-1','Higgins',0,0,0,1),
('Catharina','Research Director','Cross-Functional Specialists','specialists','Claude Sonnet','Anthropic','tier-1','Higgins',0,0,0,1),
('Barbara','International Relations','Cross-Functional Specialists','specialists','Claude Sonnet','Anthropic','tier-1','Higgins',0,0,0,1),
('Susi','Customer Success','Cross-Functional Specialists','specialists','Claude Sonnet','Anthropic','tier-1','Higgins',0,0,0,1),
-- Warren Trading Desk (2) — CLASSIFIED
('Warren','Head of Trading','Warren Trading Desk','wtd','Claude Opus','Anthropic','tier-0','Higgins',0,0,1,1),
('Abacus','Financial Analyst','Warren Trading Desk','wtd','Claude Sonnet','Anthropic','tier-1','Warren',0,0,1,1),
-- Ultra Trust Agency (17) — CLASSIFIED
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
-- Let op: is_active wordt NIET overschreven, zodat jouw keuzes behouden blijven.

SQL

echo "[2/5] Database-tabellen en teamroster voorbereid."

# ─── 3. SQL uitvoeren ─────────────────────────────────────────────────────────
echo "[3/5] Database bijwerken..."
if [ -n "${DATABASE_URL:-}" ]; then
  SQL_PATH="${SQL_FILE}" node --input-type=module <<'NODE'
import { readFileSync } from "node:fs";
import mysql from "mysql2/promise";
const url = process.env.DATABASE_URL;
const sql = readFileSync(process.env.SQL_PATH, "utf8");
const conn = await mysql.createConnection({ uri: url, multipleStatements: true });
await conn.query(sql);
await conn.end();
console.log("      Database bijgewerkt.");
NODE
elif command -v mysql >/dev/null 2>&1 && [ -n "${MYSQL_HOST:-}" ]; then
  mysql -h "${MYSQL_HOST}" -P "${MYSQL_PORT:-3306}" -u "${MYSQL_USER:-root}" \
    ${MYSQL_PASSWORD:+-p"${MYSQL_PASSWORD}"} "${MYSQL_DATABASE:-higgins_mc}" < "${SQL_FILE}"
  echo "      Database bijgewerkt."
else
  echo "      WAARSCHUWING: Geen database-verbinding gevonden."
  echo "      Voer het SQL-bestand handmatig uit: ${SQL_FILE}"
  echo "      (Of plak de inhoud in het Database-paneel van je project.)"
fi

# ─── 4. Server-routes plaatsen ────────────────────────────────────────────────
mkdir -p "${MC_DIR}/server/routes"
cat > "${MC_DIR}/server/routes/agent-edition.ts" <<'TS'
// Higgins MC — Agent & Edition Routes (auto-gegenereerd)
import type { Express, Request, Response } from "express";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function readOperatorToken(mcDir: string): string {
  if (process.env.OPERATOR_TOKEN) return process.env.OPERATOR_TOKEN.trim();
  try { return readFileSync(join(mcDir, ".operator-token"), "utf8").trim(); }
  catch { return ""; }
}

type DbLike = { query: (sql: string, params?: any[]) => Promise<any> };

export function registerAgentEditionRoutes(app: Express, db: DbLike, mcDir = process.cwd()) {
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

  // Feed voor de iPhone-app (alleen actieve agents, editie-gefilterd)
  app.get("/api/app/team-feed", async (_req: Request, res: Response) => {
    try {
      const edition = await currentEdition();
      const rows = await db.query(
        `SELECT name, role, department, department_id, model, provider, team,
                reports_to, is_orchestrator, is_addon, is_classified, is_active,
                status, current_task
         FROM agent_registry WHERE is_active = 1
         ${edition === "whitelab" ? "AND is_classified = 0" : ""}
         ORDER BY department_id, name`
      );
      const agents = (Array.isArray(rows) ? rows : rows?.[0]) || [];
      res.json({ edition, count: agents.length, agents });
    } catch (e) {
      res.status(500).json({ error: "feed_failed", detail: String(e) });
    }
  });

  // Agent aan/uit zetten (alleen operator)
  app.post("/api/mc/agent/toggle", async (req: Request, res: Response) => {
    if (!requireOperator(req, res)) return;
    const { name, isActive } = req.body || {};
    if (typeof name !== "string" || typeof isActive !== "boolean") {
      return res.status(400).json({ error: "name (string) + isActive (boolean) vereist" });
    }
    await db.query("UPDATE agent_registry SET is_active = ? WHERE name = ?", [isActive ? 1 : 0, name]);
    res.json({ ok: true, name, isActive });
  });

  // Editie wisselen (alleen operator)
  app.post("/api/mc/edition", async (req: Request, res: Response) => {
    if (!requireOperator(req, res)) return;
    const { edition } = req.body || {};
    if (edition !== "internal" && edition !== "whitelab") {
      return res.status(400).json({ error: "edition moet 'internal' of 'whitelab' zijn" });
    }
    await db.query("UPDATE edition_config SET edition = ?", [edition]);
    res.json({ ok: true, edition });
  });
}
TS

echo "[4/5] Server-routes geplaatst (server/routes/agent-edition.ts)"

# ─── 5. Drizzle-schema aanvullen ─────────────────────────────────────────────
SCHEMA_FILE="${MC_DIR}/drizzle/schema.ts"
if [ -f "${SCHEMA_FILE}" ] && ! grep -q "agent_registry" "${SCHEMA_FILE}"; then
  cat >> "${SCHEMA_FILE}" <<'TS'

// ── Agent & Edition tabellen ──
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
  echo "[5/5] Drizzle-schema aangevuld."
else
  echo "[5/5] Drizzle-schema al aanwezig — overgeslagen."
fi

rm -f "${SQL_FILE}"

echo ""
echo "======================================================="
echo "  KLAAR!"
echo ""
echo "  Voeg dit eenmalig toe aan je server-opstart:"
echo ""
echo "    import { registerAgentEditionRoutes } from './routes/agent-edition';"
echo "    registerAgentEditionRoutes(app, db);"
echo ""
echo "  De iPhone-app verbindt via:"
echo "    GET /api/app/team-feed"
echo ""
echo "  Jouw operator-commando's:"
echo "    POST /api/mc/agent/toggle  { name, isActive }"
echo "    POST /api/mc/edition       { edition }"
echo "    (met header: x-operator-token)"
echo "======================================================="
```

---

## Na het draaien

Het enige wat je nog handmatig doet is deze twee regels toevoegen aan je server-opstartbestand (bijv. `index.ts` of `server.ts`):

```typescript
import { registerAgentEditionRoutes } from "./routes/agent-edition";
registerAgentEditionRoutes(app, db);
```

Daarna is alles actief. De iPhone-app haalt het team op via `GET /api/app/team-feed`.

---

## Samenvatting

| Wat het doet | Resultaat |
|---|---|
| Database-tabellen aanmaken | `agent_registry` + `edition_config` |
| Team invullen | 66 agenten, 10 afdelingen |
| Classified markeren | Warren Trading Desk + Ultra Trust Agency |
| Server-routes plaatsen | Feed + schakel-endpoints |
| Beveiliging | Operator-token (alleen jij) |
| Veilig herhalen | Ja, idempotent |
