# Higgins MC Cloud v2 — Installatiescript (Disaster Recovery)

Eén enkel script. Kopieer, plak in de MC Cloud terminal, klaar.

**Versie:** 2.0  
**Agenten:** 88  
**Afdelingen:** 11  
**Classified:** Morgan Trading Desk, Ultra Trust Agency, Task Force Ghost  
**Target:** https://higgins-dash-bbdpujw2.manus.space

---

## Gebruik

Open een terminal in het Higgins MC Cloud-project en plak het scriptblok hieronder. Het vult alleen de database — de API-endpoints bestaan al.

---

## Het Script

```bash
#!/usr/bin/env bash
# ==============================================================================
#  Higgins Mission Control Cloud v2 — Database Seed (Disaster Recovery)
#  88 agenten | 11 afdelingen | Idempotent
#  Target: higgins-dash-bbdpujw2.manus.space
# ==============================================================================
set -euo pipefail

echo ""
echo "======================================================="
echo "  Higgins MC Cloud v2 — Database Seed"
echo "  88 agenten | 11 afdelingen"
echo "======================================================="
echo ""

# ─── SQL voorbereiden ─────────────────────────────────────────────────────────
SQL_FILE="$(mktemp /tmp/mc_v2_seed.XXXXXX.sql)"
cat > "${SQL_FILE}" <<'SQL'
-- Tabellen aanmaken (als ze nog niet bestaan)
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

CREATE TABLE IF NOT EXISTS `edition_config` (
  `id`         VARCHAR(36) NOT NULL DEFAULT (UUID()),
  `edition`    VARCHAR(16) NOT NULL DEFAULT 'internal',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);

INSERT INTO `edition_config` (`id`, `edition`)
SELECT UUID(), 'internal'
WHERE NOT EXISTS (SELECT 1 FROM `edition_config`);

-- ═══════════════════════════════════════════════════════════════════════════════
-- SEED: 88 agenten / 11 afdelingen
-- ═══════════════════════════════════════════════════════════════════════════════
INSERT INTO `agent_registry`
  (`name`,`role`,`department`,`department_id`,`model`,`provider`,`team`,`reports_to`,`is_orchestrator`,`is_addon`,`is_classified`,`is_active`)
VALUES
-- EXECUTIVE (6)
('Higgins','Chief Operating Officer','Executive Office','executive','Claude Opus','Anthropic','tier-0','Frank',1,0,0,1),
('Elena','Executive Assistant','Executive Office','executive','Claude Sonnet','Anthropic','tier-0','Higgins',1,0,0,1),
('Barbara','International Relations','Executive Office','executive','Claude Sonnet','Anthropic','tier-1','Higgins',0,0,0,1),
('Catharina','Research Director','Executive Office','executive','Claude Sonnet','Anthropic','tier-1','Higgins',0,0,0,1),
('Rosi','Community Manager','Executive Office','executive','Claude Sonnet','Anthropic','tier-1','Higgins',0,0,0,1),
('Susi','Customer Success','Executive Office','executive','Claude Sonnet','Anthropic','tier-1','Higgins',0,0,0,1),
-- EINSTEIN LAB (3)
('Einstein','Director of Research','Einstein Lab','einstein-lab','Claude Opus','Anthropic','tier-0','Higgins',0,0,0,1),
('Curie','Quantum Research','Einstein Lab','einstein-lab','Claude Sonnet','Anthropic','tier-1','Einstein',0,0,0,1),
('Tesla','Applied Physics','Einstein Lab','einstein-lab','Claude Sonnet','Anthropic','tier-1','Einstein',0,0,0,1),
-- FINANCE (5)
('Warren','Chief Financial Officer','Finance','finance','Claude Opus','Anthropic','tier-0','Higgins',0,0,0,1),
('Abacus','Financial Analyst','Finance','finance','Claude Sonnet','Anthropic','tier-1','Warren',0,0,0,1),
('Closer','Head of Sales','Finance','finance','Claude Sonnet','Anthropic','tier-1','Warren',0,0,0,1),
('Carson','Product Intelligence','Finance','finance','Claude Sonnet','Anthropic','tier-1','Closer',0,0,0,1),
('Strategos','Revenue Strategy','Finance','finance','Claude Sonnet','Anthropic','tier-1','Closer',0,0,0,1),
-- TECHNOLOGY (6)
('Elon','Chief Technology Officer','Technology Division','technology','Claude Opus','Anthropic','tier-0','Higgins',0,0,0,1),
('Da Vinci','Digital Architect (DVDA)','Technology Division','technology','Claude Sonnet','Anthropic','tier-1','Elon',0,0,0,1),
('Forge','Creative Engineer','Technology Division','technology','Claude Sonnet','Anthropic','tier-1','Elon',0,0,0,1),
('Jenkins','Backend Engineer','Technology Division','technology','Claude Sonnet','Anthropic','tier-1','Elon',0,0,0,1),
('Nexus','Integration Architect','Technology Division','technology','Claude Sonnet','Anthropic','tier-1','Elon',0,0,0,1),
('Sid','Security Engineer','Technology Division','technology','Claude Sonnet','Anthropic','tier-1','Elon',0,0,0,1),
-- MARKETING (7)
('Gary','Chief Marketing Officer','Marketing & Creative','marketing','Claude Opus','Anthropic','tier-0','Higgins',0,0,0,1),
('Anna','Market Analyst','Marketing & Creative','marketing','Claude Sonnet','Anthropic','tier-1','Gary',0,0,0,1),
('Bard','Content Writer','Marketing & Creative','marketing','Claude Sonnet','Anthropic','tier-1','Gary',0,0,0,1),
('Brando','Brand Strategist','Marketing & Creative','marketing','Claude Sonnet','Anthropic','tier-1','Gary',0,0,0,1),
('Echo','Social Media Manager','Marketing & Creative','marketing','Claude Sonnet','Anthropic','tier-1','Gary',0,0,0,1),
('Larry','SEO Specialist','Marketing & Creative','marketing','Claude Sonnet','Anthropic','tier-1','Gary',0,0,0,1),
('Picasso','Visual Designer','Marketing & Creative','marketing','Claude Sonnet','Anthropic','tier-1','Gary',0,0,0,1),
-- ENTERPRISE (14)
('Atlas','Operations Director','Enterprise Operations','enterprise','Claude Sonnet','Anthropic','tier-0','Higgins',0,0,0,1),
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
-- FMC (9)
('David','Director Longevity Science','Functional Medicine Center','fmc','Claude Opus','Anthropic','tier-0','Higgins',0,0,0,1),
('Akiko','Traditional Eastern Medicine','Functional Medicine Center','fmc','Claude Sonnet','Anthropic','tier-1','David',0,0,0,1),
('Avicenna','Pharmacogenomics','Functional Medicine Center','fmc','Claude Sonnet','Anthropic','tier-1','David',0,0,0,1),
('Maria','Director Telomere Biology','Functional Medicine Center','fmc','Gemini 2.5 Pro','Google','tier-1','David',0,0,0,1),
('Rosalind','Director Molecular Diagnostics','Functional Medicine Center','fmc','Claude Opus','Anthropic','tier-1','David',0,0,0,1),
('Samuel','Director Integrative Medicine','Functional Medicine Center','fmc','Claude Sonnet','Anthropic','tier-1','David',0,0,0,1),
('Siddhartha','Mind-Body Medicine','Functional Medicine Center','fmc','Claude Sonnet','Anthropic','tier-1','David',0,0,0,1),
('Sophia','Neuroscience & Cognition','Functional Medicine Center','fmc','Claude Sonnet','Anthropic','tier-1','David',0,0,0,1),
('Vladimir','Director Bioregulation','Functional Medicine Center','fmc','Claude Sonnet','Anthropic','tier-1','David',0,0,0,1),
-- JLC (6)
('Justitia','Chief Legal Officer','Justitia Legal Council','jlc','Claude Opus','Anthropic','tier-0','Higgins',0,0,0,1),
('Adrian','Corporate Law','Justitia Legal Council','jlc','Claude Sonnet','Anthropic','tier-1','Justitia',0,0,0,1),
('Elena Vasquez','International Law','Justitia Legal Council','jlc','Claude Sonnet','Anthropic','tier-1','Justitia',0,0,0,1),
('Isabelle','Contract Review','Justitia Legal Council','jlc','Claude Sonnet','Anthropic','tier-1','Justitia',0,0,0,1),
('Matteo','IP & Technology Law','Justitia Legal Council','jlc','Claude Sonnet','Anthropic','tier-1','Justitia',0,0,0,1),
('Nadia','Data Protection (GDPR)','Justitia Legal Council','jlc','Claude Sonnet','Anthropic','tier-1','Justitia',0,0,0,1),
-- MTD (7) — CLASSIFIED
('Morgan','Head of Trading','Morgan Trading Desk','mtd','Claude Opus','Anthropic','tier-0','Higgins',0,0,1,1),
('Atlas MTD','Quantitative Strategist','Morgan Trading Desk','mtd','Claude Sonnet','Anthropic','tier-1','Morgan',0,0,1,1),
('Cipher','Cryptographic Analyst','Morgan Trading Desk','mtd','Claude Sonnet','Anthropic','tier-1','Morgan',0,0,1,1),
('Nexus (MTD)','Market Microstructure','Morgan Trading Desk','mtd','Claude Sonnet','Anthropic','tier-1','Morgan',0,0,1,1),
('Pulse','Real-Time Signals','Morgan Trading Desk','mtd','Claude Sonnet','Anthropic','tier-1','Morgan',0,0,1,1),
('Sentinel','Risk Management','Morgan Trading Desk','mtd','Claude Sonnet','Anthropic','tier-1','Morgan',0,0,1,1),
('Viper','Execution & Arbitrage','Morgan Trading Desk','mtd','Claude Sonnet','Anthropic','tier-1','Morgan',0,0,1,1),
-- UTA (23) — CLASSIFIED
('Victoria','Head of Trust & Estate','Ultra Trust Agency','uta','Claude Opus','Anthropic','tier-0','Higgins',0,0,1,1),
('Alexander','Senior Trust Counsel','Ultra Trust Agency','uta','Claude Sonnet','Anthropic','tier-1','Victoria',0,0,1,1),
('Arabella','International Tax','Ultra Trust Agency','uta','Claude Sonnet','Anthropic','tier-1','Victoria',0,0,1,1),
('Benedict','Corporate Structuring','Ultra Trust Agency','uta','Claude Sonnet','Anthropic','tier-1','Victoria',0,0,1,1),
('Caroline Batliner','Liechtenstein Trust Law','Ultra Trust Agency','uta','Claude Sonnet','Anthropic','tier-1','Victoria',0,0,1,1),
('Charlotte','Family Governance','Ultra Trust Agency','uta','Claude Sonnet','Anthropic','tier-1','Victoria',0,0,1,1),
('Constance Montague','British Offshore Trusts','Ultra Trust Agency','uta','Claude Sonnet','Anthropic','tier-1','Victoria',0,0,1,1),
('Edward Cholmondeley','Dynastic Wealth Planning','Ultra Trust Agency','uta','Claude Sonnet','Anthropic','tier-1','Victoria',0,0,1,1),
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
('Rupert Ashworth','Channel Islands Structures','Ultra Trust Agency','uta','Claude Sonnet','Anthropic','tier-1','Victoria',0,0,1,1),
('Sebastian','Insurance & Risk','Ultra Trust Agency','uta','Claude Sonnet','Anthropic','tier-1','Victoria',0,0,1,1),
('Sophia Werdenberg','Swiss Family Office','Ultra Trust Agency','uta','Claude Sonnet','Anthropic','tier-1','Victoria',0,0,1,1),
('Theodore','Philanthropic Structures','Ultra Trust Agency','uta','Claude Sonnet','Anthropic','tier-1','Victoria',0,0,1,1),
('William Beaumont','Monaco & Riviera Trusts','Ultra Trust Agency','uta','Claude Sonnet','Anthropic','tier-1','Victoria',0,0,1,1),
-- TASK FORCE GHOST (2) — CLASSIFIED
('Zero','Ghost Commander','Task Force Ghost','task-force-ghost','Claude Opus','Anthropic','tier-0','Higgins',0,0,1,1),
('Spectre','Shadow Operations','Task Force Ghost','task-force-ghost','Claude Sonnet','Anthropic','tier-1','Zero',0,0,1,1)

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
-- BELANGRIJK: is_active wordt NIET overschreven. Jouw keuzes blijven behouden.

SQL

echo "[1/2] SQL voorbereid (88 agenten, 11 afdelingen)."

# ─── SQL uitvoeren ────────────────────────────────────────────────────────────
echo "[2/2] Database bijwerken..."
if [ -n "${DATABASE_URL:-}" ]; then
  SQL_PATH="${SQL_FILE}" node --input-type=module <<'NODE'
import { readFileSync } from "node:fs";
import mysql from "mysql2/promise";
const sql = readFileSync(process.env.SQL_PATH, "utf8");
const conn = await mysql.createConnection({ uri: process.env.DATABASE_URL, multipleStatements: true });
await conn.query(sql);
// Verificatie
const [rows] = await conn.query("SELECT COUNT(*) as total, SUM(is_classified) as classified FROM agent_registry");
const [depts] = await conn.query("SELECT department_id, COUNT(*) as cnt FROM agent_registry GROUP BY department_id ORDER BY department_id");
console.log(`\n  Totaal: ${rows[0].total} agenten (${rows[0].classified} classified)`);
console.log("  Per afdeling:");
depts.forEach(d => console.log(`    ${d.department_id}: ${d.cnt}`));
await conn.end();
NODE
else
  echo "  FOUT: DATABASE_URL niet gezet."
  echo "  Bewaar het SQL-bestand en voer het handmatig uit: ${SQL_FILE}"
  exit 1
fi

rm -f "${SQL_FILE}"

echo ""
echo "======================================================="
echo "  KLAAR!"
echo ""
echo "  Native app endpoints (bestaan al):"
echo "    GET /api/mobile/team-feed  (Bearer auth)"
echo "    GET /api/mobile/building   (Higgins Tower)"
echo ""
echo "  Classified (verborgen in whitelab-editie):"
echo "    - Morgan Trading Desk (mtd)    — 7 agenten"
echo "    - Ultra Trust Agency (uta)     — 23 agenten"
echo "    - Task Force Ghost             — 2 agenten"
echo ""
echo "  Leaders:"
echo "    executive ......... Higgins"
echo "    einstein-lab ...... Einstein"
echo "    finance ........... Warren"
echo "    technology ........ Elon"
echo "    marketing ......... Gary"
echo "    enterprise ........ Atlas"
echo "    fmc ............... David"
echo "    jlc ............... Justitia"
echo "    mtd ............... Morgan"
echo "    uta ............... Victoria"
echo "    task-force-ghost .. Zero"
echo "======================================================="
```

---

## Overzicht

| Afdeling | ID | Leader | Agenten | Classified |
|---|---|---|---|---|
| Executive Office | executive | Higgins | 6 | Nee |
| Einstein Lab | einstein-lab | Einstein | 3 | Nee |
| Finance | finance | Warren | 5 | Nee |
| Technology Division | technology | Elon | 6 | Nee |
| Marketing & Creative | marketing | Gary | 7 | Nee |
| Enterprise Operations | enterprise | Atlas | 14 | Nee |
| Functional Medicine Center | fmc | David | 9 | Nee |
| Justitia Legal Council | jlc | Justitia | 6 | Nee |
| Morgan Trading Desk | mtd | Morgan | 7 | **Ja** |
| Ultra Trust Agency | uta | Victoria | 23 | **Ja** |
| Task Force Ghost | task-force-ghost | Zero | 2 | **Ja** |
| **Totaal** | | | **88** | **32** |

---

## Bestaande Endpoints (niet aanraken)

| Endpoint | Methode | Auth | Functie |
|---|---|---|---|
| `/api/mobile/team-feed` | GET | Bearer token | Volledig team (editie-gefilterd) |
| `/api/mobile/building` | GET | Bearer token | Higgins Tower (8 floors + 3 basement) |
| `/api/mc/agent/toggle` | POST | x-operator-token | Agent aan/uit zetten |
| `/api/mc/edition` | POST | x-operator-token | Editie wisselen |

---

## Idempotentie

- `CREATE TABLE IF NOT EXISTS` — tabellen worden niet opnieuw aangemaakt
- `ON DUPLICATE KEY UPDATE` — bestaande agenten worden bijgewerkt
- `is_active` wordt **nooit** overschreven — jouw keuzes blijven altijd behouden
- Veilig om onbeperkt te herhalen
