/**
 * Shared Roster — Single Source of Truth for Command Routing
 *
 * Consumed by:
 *  - Server: Higgins system prompt, command router, PDF routing
 *  - App: agent name matching in detectAgentActivation
 *
 * All routing metadata (department keywords, specialties) is derived from
 * constants/team.ts so there is exactly ONE place to update the roster.
 */

import { TEAM, DEPARTMENTS, type Agent, type DepartmentMeta, type Edition } from "../constants/team";

// ─── Re-export core types & data ──────────────────────────────────────────────
export type { Agent, DepartmentMeta, Edition };
export { TEAM, DEPARTMENTS };

// ─── Routing metadata ─────────────────────────────────────────────────────────

/** Agent name list (all 66), used for fast matching in the app. */
export const AGENT_NAMES: string[] = TEAM.map(a => a.name);

/** Map: agent name → Agent record (for O(1) lookup). */
export const AGENT_MAP: Record<string, Agent> = Object.fromEntries(
  TEAM.map(a => [a.name, a])
);

/** Map: department name → DepartmentMeta. */
export const DEPT_MAP: Record<string, DepartmentMeta> = Object.fromEntries(
  DEPARTMENTS.map(d => [d.name, d])
);

/**
 * Department routing keywords — used by the LLM command router to match
 * natural-language intents to the correct department when no agent is named.
 * Keys are department IDs; values are keyword arrays (NL + DE + EN mixed).
 */
export const DEPT_KEYWORDS: Record<string, string[]> = {
  executive:   ["management", "strategie", "strategy", "directie", "board", "leiderschap", "leadership", "Führung"],
  technology:  ["technologie", "technology", "IT", "software", "code", "backend", "frontend", "security", "API", "integratie", "integration", "Technik"],
  marketing:   ["marketing", "content", "social media", "SEO", "branding", "campagne", "campaign", "Kampagne", "design", "visual"],
  fmc:         ["medisch", "medical", "longevity", "gezondheid", "health", "Gesundheit", "protocol", "kliniek", "clinic", "Klinik", "peptide", "NAD", "telomeer", "telomere"],
  jlc:         ["juridisch", "legal", "recht", "contract", "compliance", "GDPR", "privacy", "IP", "patent", "Recht", "Vertrag"],
  sales:       ["sales", "verkoop", "Verkauf", "revenue", "offerte", "proposal", "pricing", "deal", "prospect"],
  enterprise:  ["operatie", "operations", "HR", "facility", "supply chain", "kwaliteit", "quality", "Qualität", "communicatie", "communications", "training", "analytics", "data"],
  specialists: ["research", "onderzoek", "Forschung", "vertaling", "translation", "Übersetzung", "klant", "customer", "Kunde", "medisch advies"],
  wtd:         ["trading", "handel", "Polymarket", "crypto", "portfolio", "investering", "investment", "Investition", "beurs", "market", "Markt", "financieel", "financial", "finanziell"],
  uta:         ["trust", "estate", "vermogen", "wealth", "Vermögen", "stichting", "foundation", "Stiftung", "holding", "belasting", "tax", "Steuer", "successie", "succession", "Nachfolge", "family office", "philanthropy"],
};

/**
 * Build a compact roster summary for the Higgins system prompt.
 * Groups agents by department with roles, suitable for LLM context.
 */
export function buildRosterPromptBlock(edition: Edition = "internal"): string {
  const depts = edition === "whitelab"
    ? DEPARTMENTS.filter(d => !d.classified)
    : DEPARTMENTS;

  const lines: string[] = [];
  for (const dept of depts) {
    const agents = TEAM.filter(a => a.department === dept.name && (edition === "internal" || !a.isClassified));
    const agentList = agents.map(a => `${a.name} (${a.role})`).join(", ");
    lines.push(`- **${dept.name}** [${dept.shortName}] — Head: ${dept.head} — ${agents.length} agents: ${agentList}`);
  }
  return lines.join("\n");
}

/**
 * Build a JSON-friendly routing table for the LLM command router.
 * Smaller than the full roster — just name, role, department, specialties.
 */
export function buildRoutingTable(edition: Edition = "internal"): Array<{ name: string; role: string; department: string; specialties: string[] }> {
  const agents = edition === "whitelab" ? TEAM.filter(a => !a.isClassified) : TEAM;
  return agents.map(a => ({
    name: a.name,
    role: a.role,
    department: a.department,
    specialties: a.specialties ?? [],
  }));
}
