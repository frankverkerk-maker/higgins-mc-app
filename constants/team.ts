// ─── Higgins Command Center (HCC) — Officieel Team Overzicht ──────────────────
// Swiss Vitality Clinics AG · Higgins AI System
// Bron: HCC Complete Implementation Document v1.0.0 (29 June 2026)
// 12 Departments · 42 Agents · 3 classified (UTA, WTD, Task Force Ghost)
//
// TFG (Task Force Ghost) toont géén agentnamen — operational security.

export type AgentStatus =
  | "active"
  | "standby"
  | "offline"
  | "training"
  | "human"
  | "inactive"
  | "suspended";

export type Agent = {
  name: string;
  role: string;
  /** Department display name (matches DEPARTMENTS entry). */
  department: string;
  /** Optionele specialismen uit het masterdocument. */
  specialties?: string[];
  /** LLM model (bv. "Claude Opus"). */
  model?: string;
  /** Provider (bv. "Anthropic"). */
  provider?: string;
  /** Interne team-code (bv. "team-elon", "board", "directie"). */
  team?: string;
  /** Aan wie deze agent rapporteert. */
  reportsTo?: string;
  isOrchestrator?: boolean;
  /** Add-on afdeling (optioneel uitbreidbaar pakket). */
  isAddOn?: boolean;
  /** Geheime/interne afdeling. Wordt verborgen in de Whitelab-klantversie. */
  isClassified?: boolean;
};

export type DepartmentMeta = {
  /** Display naam (gebruikt als key door de UI). */
  name: string;
  /** Korte code (bv. "MC", "UTA", "WTD"). */
  shortName?: string;
  /** Stabiele id uit het masterdocument. */
  id: string;
  head: string;
  classified?: boolean;
  addOn?: boolean;
};

// ─── Departementen (12) — volgorde zoals getoond in Team Pulse ─────────────────
export const DEPARTMENTS: DepartmentMeta[] = [
  { id: "higgins-mc",      name: "Higgins Mission Control",      shortName: "MC",  head: "Higgins" },
  { id: "engineering",     name: "Technology & Engineering",     shortName: "ENG", head: "Elon" },
  { id: "gmd",             name: "Gary's Marketing Department",   shortName: "GMD", head: "Gary" },
  { id: "fmc",             name: "Functional Medicine Center",    shortName: "FMC", head: "Vita" },
  { id: "erl",             name: "Einstein Research Lab",         shortName: "ERL", head: "Catharina" },
  { id: "jlc",             name: "Justitia Legal Council",        shortName: "JLC", head: "Justitia", addOn: true },
  { id: "operations",      name: "Operations & Finance",          shortName: "OPS", head: "Higgins" },
  { id: "content-studio",  name: "Content Studio",                shortName: "CS",  head: "Gary" },
  { id: "shared-services", name: "Shared Services & Specialists", shortName: "SS",  head: "—" },
  // ── Classified — altijd onderaan, verborgen in Whitelab ──
  { id: "uta",             name: "United Trust Agency",           shortName: "UTA", head: "Victoria", classified: true },
  { id: "wtd",             name: "Warren Trading Desk",           shortName: "WTD", head: "Warren",   classified: true },
  { id: "task-force-ghost",name: "Task Force Ghost",              shortName: "TFG", head: "Classified", classified: true },
];

// Helper voor volgorde-array die de UI gebruikt
export const DEPARTMENT_ORDER: string[] = DEPARTMENTS.map(d => d.name);

// ─── Agents (42) ───────────────────────────────────────────────────────────────
export const TEAM: Agent[] = [
  // ── 1. Higgins Mission Control ────────────────────────────────────────────
  { name: "Higgins", role: "COO / Chief of Staff", department: "Higgins Mission Control", isOrchestrator: true, team: "directie", reportsTo: "Frank", model: "Claude Opus", provider: "Anthropic" },
  { name: "Elena",   role: "Office Manager / Receptioniste", department: "Higgins Mission Control", isOrchestrator: true, team: "directie", reportsTo: "Higgins", model: "Claude Sonnet", provider: "Anthropic" },

  // ── 2. Technology & Engineering ───────────────────────────────────────────
  { name: "Elon",    role: "CTO / Department Head", department: "Technology & Engineering", team: "board", reportsTo: "Higgins", model: "Claude Sonnet", provider: "Anthropic", specialties: ["system-architecture", "technology-strategy", "team-leadership"] },
  { name: "Jenkins", role: "Backend Engineer",      department: "Technology & Engineering", team: "team-elon", reportsTo: "Elon", model: "Claude Sonnet", provider: "Anthropic", specialties: ["backend-dev", "APIs", "databases", "server-infrastructure"] },
  { name: "Forge",   role: "Frontend Engineer",     department: "Technology & Engineering", team: "team-elon", reportsTo: "Elon", model: "Claude Sonnet", provider: "Anthropic", specialties: ["frontend-dev", "React", "UI/UX implementation"] },
  { name: "Nexus",   role: "DevOps & Infra",        department: "Technology & Engineering", team: "team-elon", reportsTo: "Elon", model: "Claude Sonnet", provider: "Anthropic", specialties: ["devops", "CI/CD", "cloud-infrastructure", "monitoring"] },
  { name: "Quinn",   role: "QA Engineer",           department: "Technology & Engineering", team: "team-elon", reportsTo: "Elon", model: "Claude Sonnet", provider: "Anthropic", specialties: ["testing", "quality-assurance", "automation", "bug-tracking"] },
  { name: "Sid",     role: "Security Engineer",     department: "Technology & Engineering", team: "team-elon", reportsTo: "Elon", model: "Claude Sonnet", provider: "Anthropic", specialties: ["security-audits", "penetration-testing", "compliance", "encryption"] },

  // ── 3. Gary's Marketing Department ────────────────────────────────────────
  { name: "Gary",    role: "CMO / Department Head", department: "Gary's Marketing Department", team: "board", reportsTo: "Higgins", model: "Claude Sonnet", provider: "Anthropic", specialties: ["marketing-strategy", "brand-management", "campaign-oversight", "market-analysis"] },
  { name: "Bard",    role: "Content Creator",       department: "Gary's Marketing Department", team: "team-gary", reportsTo: "Gary", model: "Grok 3", provider: "xAI", specialties: ["long-form-writing", "thought-leadership", "ghostwriting", "storytelling", "email-sequences"] },
  { name: "Picasso", role: "Visual Designer",       department: "Gary's Marketing Department", team: "team-gary", reportsTo: "Gary", model: "Grok 3", provider: "xAI", specialties: ["brand-assets", "visual-content", "design-systems", "image-generation"] },
  { name: "Echo",    role: "Social Media Manager",  department: "Gary's Marketing Department", team: "team-gary", reportsTo: "Gary", model: "Claude Sonnet", provider: "Anthropic", specialties: ["social-scheduling", "community-engagement", "engagement-optimization", "hashtags"] },
  { name: "Anna",    role: "SEO & Competitive Intelligence", department: "Gary's Marketing Department", team: "team-gary", reportsTo: "Gary", model: "Claude Sonnet", provider: "Anthropic", specialties: ["keyword-research", "seo-content", "reddit-monitoring", "geo-optimization"] },
  { name: "Larry",   role: "Viral Marketing Agent", department: "Gary's Marketing Department", team: "team-gary", reportsTo: "Gary", model: "Claude Sonnet", provider: "Anthropic", specialties: ["tiktok-marketing", "viral-content", "trend-surfing", "data-driven-content"] },
  { name: "Brando",  role: "Brand Manager",         department: "Gary's Marketing Department", team: "team-gary", reportsTo: "Gary", model: "Claude Sonnet", provider: "Anthropic", specialties: ["brand-architecture", "stealth-marketing", "medical-credibility", "scarcity-engineering", "luxury-patient-journey"] },
  { name: "Flash",   role: "High-Speed Content Scaling", department: "Gary's Marketing Department", team: "team-gary", reportsTo: "Gary", model: "Claude Sonnet", provider: "Anthropic", specialties: ["content-variants", "localization", "a-b-testing", "content-calendar"] },

  // ── 4. Functional Medicine Center ─────────────────────────────────────────
  { name: "Vita",   role: "Head of Health, Safety & Wellbeing", department: "Functional Medicine Center", team: "enterprise", reportsTo: "Higgins", model: "Claude Sonnet", provider: "Anthropic", specialties: ["occupational-health", "wellness-programs", "risk-assessment", "mental-health", "preventive-care"] },
  { name: "Sophia", role: "Chief Medical Therapist", department: "Functional Medicine Center", team: "fmc", reportsTo: "Vita", model: "Claude Sonnet", provider: "Anthropic", specialties: ["regenerative-medicine", "functional-medicine", "longevity-science", "peptide-therapy", "NAD+", "GLP-1", "bioregulators", "epigenetics"] },
  { name: "Prof. David Sinclair",     role: "Director of Longevity Science / CSO", department: "Functional Medicine Center", team: "fmc-board", reportsTo: "Vita", specialties: ["Information Theory of Aging", "NAD+/Sirtuins", "Epigenetic Reprogramming", "Horvath Clocks"] },
  { name: "Prof. Vladimir Khavinson", role: "Director of Peptide Bioregulation", department: "Functional Medicine Center", team: "fmc-board", reportsTo: "Vita", specialties: ["short regulatory peptides", "epithalon", "thymalin", "organ-specific bioregulators", "geroprotection"] },
  { name: "Prof. Rosalind Franklin",  role: "Director of Molecular Diagnostics", department: "Functional Medicine Center", team: "fmc-board", reportsTo: "Vita", specialties: ["telomere biology", "epigenetic clocks", "DNA methylation arrays", "biological age assessment"] },
  { name: "Prof. Samuel Hahnemann",   role: "Director of Integrative Medicine", department: "Functional Medicine Center", team: "fmc-board", reportsTo: "Vita", specialties: ["hormesis", "low-dose therapeutics", "vitalism", "integrative protocols", "mind-body medicine"] },
  { name: "Prof. Maria Blasco",       role: "Director of Telomere & Cancer Research", department: "Functional Medicine Center", team: "fmc-board", reportsTo: "Vita", specialties: ["telomerase activation", "telomere length maintenance", "cancer-aging interface", "gene therapy"] },

  // ── 5. Einstein Research Lab ──────────────────────────────────────────────
  { name: "Catharina", role: "Head of Research / Chief Research Officer", department: "Einstein Research Lab", team: "specialists", reportsTo: "Higgins", model: "Sonar Pro", provider: "Perplexity", specialties: ["deep-research", "medical-intelligence", "evidence-based-analysis", "report-writing"] },
  { name: "Oracle",    role: "Market Intelligence Analyst", department: "Einstein Research Lab", team: "erl", reportsTo: "Catharina", model: "Claude Sonnet", provider: "Anthropic", specialties: ["market-research", "competitor-scan", "trend-detection", "data-synthesis"] },
  { name: "Atlas",     role: "Data Scientist", department: "Einstein Research Lab", team: "enterprise", reportsTo: "Catharina", model: "Claude Sonnet", provider: "Anthropic", specialties: ["data-analysis", "predictive-analytics", "statistical-modeling", "visualization"] },

  // ── 6. Justitia Legal Council (Add-On) ────────────────────────────────────
  { name: "Justitia", role: "Head of Legal / Chief Legal Officer", department: "Justitia Legal Council", isAddOn: true, team: "specialists", reportsTo: "Higgins", model: "Claude Sonnet", provider: "Anthropic", specialties: ["contract-review", "compliance-analysis", "risk-assessment", "regulatory-guidance", "gdpr", "ip-law"] },
  { name: "Vera",     role: "Compliance Officer", department: "Justitia Legal Council", isAddOn: true, team: "enterprise", reportsTo: "Justitia", model: "Claude Sonnet", provider: "Anthropic", specialties: ["regulatory-compliance", "audits", "internal-controls", "policy-development", "esg"] },

  // ── 7. Operations & Finance ───────────────────────────────────────────────
  { name: "Hugo",   role: "HR Manager",             department: "Operations & Finance", team: "enterprise", reportsTo: "Higgins", model: "Claude Sonnet", provider: "Anthropic", specialties: ["hr-operations", "recruitment", "employee-relations"] },
  { name: "Oscar",  role: "Project Manager",        department: "Operations & Finance", team: "enterprise", reportsTo: "Higgins", model: "Claude Sonnet", provider: "Anthropic", specialties: ["project-planning", "resource-allocation", "milestone-tracking"] },
  { name: "Flora",  role: "Sustainability Officer", department: "Operations & Finance", team: "enterprise", reportsTo: "Higgins", model: "Claude Sonnet", provider: "Anthropic", specialties: ["esg-reporting", "sustainability-strategy", "carbon-footprint"] },
  { name: "Mentor", role: "Training & Development",  department: "Operations & Finance", team: "enterprise", reportsTo: "Higgins", model: "Claude Sonnet", provider: "Anthropic", specialties: ["onboarding", "skill-development", "learning-paths"] },

  // ── 8. Content Studio ─────────────────────────────────────────────────────
  // 7-Agent Content Pipeline (geen apart benoemde agents in masterdoc;
  // creatief beheer door Gary). Toont als pipeline-afdeling.

  // ── 9. Shared Services & Specialists ──────────────────────────────────────
  { name: "WebArchitect", role: "Website & Solution Specialist", department: "Shared Services & Specialists", team: "specialists", reportsTo: "Frank", model: "Claude Sonnet", provider: "Anthropic", specialties: ["web-development", "saas-architecture", "crm-replacement", "compliance-tools", "conversion-optimization", "ux-design", "api-integration", "automation"] },
  { name: "Barbara",      role: "Translator", department: "Shared Services & Specialists", team: "specialists", reportsTo: "Higgins", model: "Claude Sonnet", provider: "Anthropic", specialties: ["multilingual-translation", "localization", "cultural-adaptation"] },
  { name: "Rosi",         role: "Community Bot", department: "Shared Services & Specialists", team: "community", reportsTo: "Higgins", model: "Claude Sonnet", provider: "Anthropic", specialties: ["community-engagement", "moderation"] },

  // ── 10. United Trust Agency (UTA) — CLASSIFIED ────────────────────────────
  { name: "Victoria", role: "Head of Trust & Estate Planning", department: "United Trust Agency", isClassified: true, team: "uta", reportsTo: "Higgins", model: "Claude Sonnet", provider: "Anthropic", specialties: ["trust-structures", "tax-treaties", "jurisdiction-selection", "estate-planning", "asset-protection", "CH/LI/LU"] },
  { name: "Justitia (UTA)", role: "Legal Counsel (shared with JLC)", department: "United Trust Agency", isClassified: true, team: "uta", reportsTo: "Victoria", model: "Claude Sonnet", provider: "Anthropic", specialties: ["regulatory-compliance", "contract-review", "GDPR", "CRS/AEOI", "anti-money-laundering"] },

  // ── 11. Warren Trading Desk (WTD) — CLASSIFIED ────────────────────────────
  { name: "Warren",   role: "CRO / Department Head", department: "Warren Trading Desk", isClassified: true, team: "board", reportsTo: "Higgins", model: "Claude Sonnet", provider: "Anthropic", specialties: ["revenue-strategy", "deal-oversight", "partnership-development", "financial-planning"] },
  { name: "Abacus",   role: "Financial Analyst",    department: "Warren Trading Desk", isClassified: true, team: "team-warren", reportsTo: "Warren", model: "Claude Sonnet", provider: "Anthropic", specialties: ["financial-forecast", "budget-analysis", "roi-calculator", "cost-optimization", "bookkeeping"] },
  { name: "Closer",   role: "Sales Agent",          department: "Warren Trading Desk", isClassified: true, team: "team-warren", reportsTo: "Warren", model: "Claude Sonnet", provider: "Anthropic", specialties: ["proposals", "pitch-decks", "negotiation", "closing-strategy"] },
  { name: "Carson",   role: "Lead Generation",      department: "Warren Trading Desk", isClassified: true, team: "team-warren", reportsTo: "Warren", model: "Claude Sonnet", provider: "Anthropic", specialties: ["prospect-research", "qualification-scoring", "outreach"] },
  { name: "Strategos",role: "Business Strategy Architect", department: "Warren Trading Desk", isClassified: true, team: "team-warren", reportsTo: "Warren", model: "Claude Sonnet", provider: "Anthropic", specialties: ["partnership-design", "contract-structuring", "joint-ventures", "licensing", "franchise-models"] },

  // ── 12. Task Force Ghost (TFG) — CLASSIFIED (geen zichtbare agents) ────────
  // Operational security: er worden geen agentnamen blootgesteld.
];

// ─── Whitelab helper ───────────────────────────────────────────────────────────
// Levert de team-set voor de gewenste editie.
// - "internal": volledige FMC incl. classified afdelingen (jullie eigen dev-omgeving)
// - "whitelab": classified afdelingen verborgen voor klanten
export type Edition = "internal" | "whitelab";

export function getTeam(edition: Edition = "internal"): Agent[] {
  if (edition === "whitelab") return TEAM.filter(a => !a.isClassified);
  return TEAM;
}

export function getDepartments(edition: Edition = "internal"): DepartmentMeta[] {
  if (edition === "whitelab") return DEPARTMENTS.filter(d => !d.classified);
  return DEPARTMENTS;
}

// Kernteam voor de "Live activiteit" sectie bovenaan Team Pulse
export const PULSE_TEAM: Agent[] = [
  TEAM.find(a => a.name === "Higgins")!,
  TEAM.find(a => a.name === "Elena")!,
  TEAM.find(a => a.name === "Gary")!,
  TEAM.find(a => a.name === "Elon")!,
];
