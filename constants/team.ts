// ─── Higgins Command Center (HCC) — Officieel Team Overzicht ──────────────────
// Swiss Vitality Clinics AG · Higgins AI System
// Bron: HCC Native App Update v2.0.0 (Juli 2026)
// 10 Departments · 66 Agents · 2 classified (WTD, UTA)
//
// v2.0 wijzigingen t.o.v. v1.0:
//  - Nieuwe indeling: Executive, Technology, Marketing, WTD, FMC, UTA, JLC,
//    Sales, Enterprise, Specialists.
//  - UTA uitgebreid naar 17 agents (Ultra Trust Agency).
//  - Task Force Ghost & Content Studio & Einstein Research Lab vervallen als
//    aparte afdelingen; hun rollen zijn verdeeld over de nieuwe structuur.
//  - Classified = WTD + UTA (verborgen in de Whitelab-klantversie).

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
  /** Interne team-code / tier-indicatie. */
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
  /** Korte code (bv. "EXEC", "UTA", "WTD"). */
  shortName?: string;
  /** Stabiele id uit het masterdocument. */
  id: string;
  head: string;
  classified?: boolean;
  addOn?: boolean;
};

// ─── Departementen (10) — volgorde zoals getoond in Team Pulse ─────────────────
export const DEPARTMENTS: DepartmentMeta[] = [
  { id: "executive",   name: "Executive Office",             shortName: "EXEC",  head: "Higgins" },
  { id: "technology",  name: "Technology Division",          shortName: "TECH",  head: "Elon" },
  { id: "marketing",   name: "Marketing & Creative",         shortName: "GMD",   head: "Gary" },
  { id: "fmc",         name: "Functional Medicine Center",   shortName: "FMC",   head: "David" },
  { id: "jlc",         name: "Justitia Legal Council",       shortName: "JLC",   head: "Justitia" },
  { id: "sales",       name: "Sales & Revenue",              shortName: "SALES", head: "Closer" },
  { id: "enterprise",  name: "Enterprise Operations",        shortName: "ENT",   head: "Atlas" },
  { id: "specialists", name: "Cross-Functional Specialists", shortName: "SPEC",  head: "Sophia" },
  // ── Classified — altijd onderaan, verborgen in Whitelab ──
  { id: "wtd",         name: "Warren Trading Desk",          shortName: "WTD",   head: "Warren",   classified: true },
  { id: "uta",         name: "Ultra Trust Agency",           shortName: "UTA",   head: "Victoria", classified: true },
];

// Helper voor volgorde-array die de UI gebruikt
export const DEPARTMENT_ORDER: string[] = DEPARTMENTS.map(d => d.name);

// ─── Agents (66) ───────────────────────────────────────────────────────────────
export const TEAM: Agent[] = [
  // ── 1. Executive Office (3) ─────────────────────────────────────────────────
  { name: "Higgins", role: "Chief Operating Officer", department: "Executive Office", isOrchestrator: true, team: "tier-0", reportsTo: "Frank", model: "Claude Opus", provider: "Anthropic" },
  { name: "Elena",   role: "Executive Assistant",     department: "Executive Office", isOrchestrator: true, team: "tier-0", reportsTo: "Higgins", model: "Claude Sonnet", provider: "Anthropic" },
  { name: "Rosi",    role: "Community Manager",        department: "Executive Office", team: "tier-1", reportsTo: "Higgins", model: "Claude Sonnet", provider: "Anthropic" },

  // ── 2. Technology Division (6) ──────────────────────────────────────────────
  { name: "Elon",     role: "Chief Technology Officer", department: "Technology Division", team: "tier-0", reportsTo: "Higgins", model: "Claude Opus", provider: "Anthropic", specialties: ["system-architecture", "technology-strategy", "team-leadership"] },
  { name: "Jenkins",  role: "Backend Engineer",         department: "Technology Division", team: "tier-1", reportsTo: "Elon", model: "Claude Sonnet", provider: "Anthropic", specialties: ["backend-dev", "APIs", "databases"] },
  { name: "Sid",      role: "Security Engineer",        department: "Technology Division", team: "tier-1", reportsTo: "Elon", model: "Claude Sonnet", provider: "Anthropic", specialties: ["security-audits", "penetration-testing", "compliance"] },
  { name: "Forge",    role: "Creative Engineer",        department: "Technology Division", team: "tier-1", reportsTo: "Elon", model: "Claude Sonnet", provider: "Anthropic", specialties: ["frontend-dev", "UI/UX", "prototyping"] },
  { name: "Nexus",    role: "Integration Architect",    department: "Technology Division", team: "tier-1", reportsTo: "Elon", model: "Claude Sonnet", provider: "Anthropic", specialties: ["integrations", "APIs", "middleware"] },
  { name: "Da Vinci", role: "Digital Architect (DVDA)", department: "Technology Division", team: "tier-1", reportsTo: "Elon", model: "Claude Sonnet", provider: "Anthropic", specialties: ["digital-architecture", "design-systems", "innovation"] },

  // ── 3. Marketing & Creative (6) ─────────────────────────────────────────────
  { name: "Gary",    role: "Chief Marketing Officer", department: "Marketing & Creative", team: "tier-0", reportsTo: "Higgins", model: "Claude Opus", provider: "Anthropic", specialties: ["marketing-strategy", "brand-management", "campaign-oversight"] },
  { name: "Bard",    role: "Content Writer",          department: "Marketing & Creative", team: "tier-1", reportsTo: "Gary", model: "Claude Sonnet", provider: "Anthropic", specialties: ["long-form-writing", "storytelling", "email-sequences"] },
  { name: "Picasso", role: "Visual Designer",         department: "Marketing & Creative", team: "tier-1", reportsTo: "Gary", model: "Claude Sonnet", provider: "Anthropic", specialties: ["brand-assets", "visual-content", "image-generation"] },
  { name: "Echo",    role: "Social Media Manager",    department: "Marketing & Creative", team: "tier-1", reportsTo: "Gary", model: "Claude Sonnet", provider: "Anthropic", specialties: ["social-scheduling", "community-engagement", "hashtags"] },
  { name: "Anna",    role: "Market Analyst",          department: "Marketing & Creative", team: "tier-1", reportsTo: "Gary", model: "Claude Sonnet", provider: "Anthropic", specialties: ["market-research", "competitive-intelligence", "trend-detection"] },
  { name: "Larry",   role: "SEO Specialist",          department: "Marketing & Creative", team: "tier-1", reportsTo: "Gary", model: "Claude Sonnet", provider: "Anthropic", specialties: ["keyword-research", "seo-content", "geo-optimization"] },

  // ── 4. Functional Medicine Center (5) ───────────────────────────────────────
  { name: "David",    role: "Director Longevity Science",     department: "Functional Medicine Center", team: "tier-1", reportsTo: "Higgins", model: "Claude Opus", provider: "Anthropic", specialties: ["Information Theory of Aging", "NAD+/Sirtuins", "Epigenetic Reprogramming"] },
  { name: "Vladimir", role: "Director Bioregulation",         department: "Functional Medicine Center", team: "tier-1", reportsTo: "David", model: "Claude Sonnet", provider: "Anthropic", specialties: ["regulatory peptides", "epithalon", "geroprotection"] },
  { name: "Samuel",   role: "Director Integrative Medicine",  department: "Functional Medicine Center", team: "tier-1", reportsTo: "David", model: "Claude Sonnet", provider: "Anthropic", specialties: ["hormesis", "low-dose therapeutics", "integrative protocols"] },
  { name: "Rosalind", role: "Director Molecular Diagnostics", department: "Functional Medicine Center", team: "tier-1", reportsTo: "David", model: "Claude Opus", provider: "Anthropic", specialties: ["telomere biology", "epigenetic clocks", "DNA methylation"] },
  { name: "Maria",    role: "Director Telomere Biology",      department: "Functional Medicine Center", team: "tier-1", reportsTo: "David", model: "Gemini 2.5 Pro", provider: "Google", specialties: ["telomerase activation", "cancer-aging interface", "gene therapy"] },

  // ── 5. Justitia Legal Council (6) ───────────────────────────────────────────
  { name: "Justitia", role: "Chief Legal Officer",      department: "Justitia Legal Council", team: "tier-0", reportsTo: "Higgins", model: "Claude Opus", provider: "Anthropic", specialties: ["legal-strategy", "risk-assessment", "regulatory-guidance"] },
  { name: "Adrian",   role: "Corporate Law",            department: "Justitia Legal Council", team: "tier-1", reportsTo: "Justitia", model: "Claude Sonnet", provider: "Anthropic", specialties: ["corporate-law", "M&A", "governance"] },
  { name: "Elena V.", role: "International Law",         department: "Justitia Legal Council", team: "tier-1", reportsTo: "Justitia", model: "Claude Sonnet", provider: "Anthropic", specialties: ["international-law", "cross-border", "treaties"] },
  { name: "Isabelle", role: "Contract Review",          department: "Justitia Legal Council", team: "tier-1", reportsTo: "Justitia", model: "Claude Sonnet", provider: "Anthropic", specialties: ["contract-review", "drafting", "negotiation"] },
  { name: "Matteo",   role: "IP & Technology Law",      department: "Justitia Legal Council", team: "tier-1", reportsTo: "Justitia", model: "Claude Sonnet", provider: "Anthropic", specialties: ["ip-law", "patents", "technology-law"] },
  { name: "Nadia",    role: "Data Protection (GDPR)",   department: "Justitia Legal Council", team: "tier-1", reportsTo: "Justitia", model: "Claude Sonnet", provider: "Anthropic", specialties: ["gdpr", "data-protection", "privacy-compliance"] },

  // ── 6. Sales & Revenue (3) ──────────────────────────────────────────────────
  { name: "Closer",    role: "Head of Sales",         department: "Sales & Revenue", team: "tier-1", reportsTo: "Higgins", model: "Claude Sonnet", provider: "Anthropic", specialties: ["proposals", "negotiation", "closing-strategy"] },
  { name: "Carson",    role: "Product Intelligence",  department: "Sales & Revenue", team: "tier-1", reportsTo: "Closer", model: "Claude Sonnet", provider: "Anthropic", specialties: ["product-intelligence", "prospect-research", "qualification"] },
  { name: "Strategos", role: "Revenue Strategy",      department: "Sales & Revenue", team: "tier-1", reportsTo: "Closer", model: "Claude Sonnet", provider: "Anthropic", specialties: ["revenue-strategy", "partnership-design", "pricing"] },

  // ── 7. Enterprise Operations (14) ───────────────────────────────────────────
  { name: "Atlas",  role: "Operations Director",      department: "Enterprise Operations", team: "tier-1", reportsTo: "Higgins", model: "Claude Sonnet", provider: "Anthropic", specialties: ["operations", "coordination", "process-optimization"] },
  { name: "Bridge", role: "Integration Coordinator",  department: "Enterprise Operations", team: "tier-1", reportsTo: "Atlas", model: "Claude Sonnet", provider: "Anthropic", specialties: ["integration", "coordination", "workflow"] },
  { name: "Felix",  role: "Quality Assurance",        department: "Enterprise Operations", team: "tier-1", reportsTo: "Atlas", model: "Claude Sonnet", provider: "Anthropic", specialties: ["qa", "testing", "quality-control"] },
  { name: "Flora",  role: "Wellness Programs",        department: "Enterprise Operations", team: "tier-1", reportsTo: "Atlas", model: "Claude Sonnet", provider: "Anthropic", specialties: ["wellness-programs", "sustainability", "esg"] },
  { name: "Herald", role: "Communications",           department: "Enterprise Operations", team: "tier-1", reportsTo: "Atlas", model: "Claude Sonnet", provider: "Anthropic", specialties: ["communications", "pr", "announcements"] },
  { name: "Hugo",   role: "HR & Talent",              department: "Enterprise Operations", team: "tier-1", reportsTo: "Atlas", model: "Claude Sonnet", provider: "Anthropic", specialties: ["hr-operations", "recruitment", "employee-relations"] },
  { name: "Iris",   role: "Patient Experience",       department: "Enterprise Operations", team: "tier-1", reportsTo: "Atlas", model: "Claude Sonnet", provider: "Anthropic", specialties: ["patient-experience", "cx", "service-quality"] },
  { name: "Max",    role: "Facility Operations",      department: "Enterprise Operations", team: "tier-1", reportsTo: "Atlas", model: "Claude Sonnet", provider: "Anthropic", specialties: ["facility-management", "operations", "logistics"] },
  { name: "Mentor", role: "Training & Development",    department: "Enterprise Operations", team: "tier-1", reportsTo: "Atlas", model: "Claude Sonnet", provider: "Anthropic", specialties: ["onboarding", "skill-development", "learning-paths"] },
  { name: "Nova",   role: "Innovation & R&D",         department: "Enterprise Operations", team: "tier-1", reportsTo: "Atlas", model: "Claude Sonnet", provider: "Anthropic", specialties: ["innovation", "r&d", "prototyping"] },
  { name: "Oscar",  role: "Supply Chain",             department: "Enterprise Operations", team: "tier-1", reportsTo: "Atlas", model: "Claude Sonnet", provider: "Anthropic", specialties: ["supply-chain", "procurement", "logistics"] },
  { name: "Quinn",  role: "Data Analytics",           department: "Enterprise Operations", team: "tier-1", reportsTo: "Atlas", model: "Claude Sonnet", provider: "Anthropic", specialties: ["data-analytics", "reporting", "dashboards"] },
  { name: "Vera",   role: "Regulatory Affairs",       department: "Enterprise Operations", team: "tier-1", reportsTo: "Atlas", model: "Claude Sonnet", provider: "Anthropic", specialties: ["regulatory-affairs", "compliance", "audits"] },
  { name: "Vita",   role: "Vitality Programs",        department: "Enterprise Operations", team: "tier-1", reportsTo: "Atlas", model: "Claude Sonnet", provider: "Anthropic", specialties: ["vitality-programs", "preventive-care", "wellness"] },

  // ── 8. Cross-Functional Specialists (4) ─────────────────────────────────────
  { name: "Sophia",    role: "Chief Medical Officer",  department: "Cross-Functional Specialists", team: "tier-1", reportsTo: "Higgins", model: "Claude Opus", provider: "Anthropic", specialties: ["functional-medicine", "regenerative-medicine", "clinical-oversight"] },
  { name: "Catharina", role: "Research Director",      department: "Cross-Functional Specialists", team: "tier-1", reportsTo: "Higgins", model: "Claude Sonnet", provider: "Anthropic", specialties: ["deep-research", "evidence-based-analysis", "report-writing"] },
  { name: "Barbara",   role: "International Relations", department: "Cross-Functional Specialists", team: "tier-1", reportsTo: "Higgins", model: "Claude Sonnet", provider: "Anthropic", specialties: ["translation", "localization", "cultural-adaptation"] },
  { name: "Susi",      role: "Customer Success",       department: "Cross-Functional Specialists", team: "tier-1", reportsTo: "Higgins", model: "Claude Sonnet", provider: "Anthropic", specialties: ["customer-success", "onboarding", "retention"] },

  // ── 9. Warren Trading Desk (WTD) — CLASSIFIED (2) ───────────────────────────
  { name: "Warren", role: "Head of Trading",    department: "Warren Trading Desk", isClassified: true, team: "tier-0", reportsTo: "Higgins", model: "Claude Opus", provider: "Anthropic", specialties: ["prediction-markets", "trading-strategy", "risk-management"] },
  { name: "Abacus", role: "Financial Analyst",  department: "Warren Trading Desk", isClassified: true, team: "tier-1", reportsTo: "Warren", model: "Claude Sonnet", provider: "Anthropic", specialties: ["financial-forecast", "roi-calculator", "cost-optimization"] },

  // ── 10. Ultra Trust Agency (UTA) — CLASSIFIED (17) ──────────────────────────
  { name: "Victoria",   role: "Head of Trust & Estate",       department: "Ultra Trust Agency", isClassified: true, team: "tier-0", reportsTo: "Higgins", model: "Claude Opus", provider: "Anthropic", specialties: ["trust-structures", "estate-planning", "asset-protection"] },
  { name: "Alexander",  role: "Senior Trust Counsel",         department: "Ultra Trust Agency", isClassified: true, team: "tier-1", reportsTo: "Victoria", model: "Claude Sonnet", provider: "Anthropic", specialties: ["trust-counsel", "fiduciary-law", "structuring"] },
  { name: "Arabella",   role: "International Tax",             department: "Ultra Trust Agency", isClassified: true, team: "tier-1", reportsTo: "Victoria", model: "Claude Sonnet", provider: "Anthropic", specialties: ["international-tax", "tax-treaties", "cross-border"] },
  { name: "Benedict",   role: "Corporate Structuring",        department: "Ultra Trust Agency", isClassified: true, team: "tier-1", reportsTo: "Victoria", model: "Claude Sonnet", provider: "Anthropic", specialties: ["corporate-structuring", "holding-companies", "governance"] },
  { name: "Charlotte",  role: "Family Governance",            department: "Ultra Trust Agency", isClassified: true, team: "tier-1", reportsTo: "Victoria", model: "Claude Sonnet", provider: "Anthropic", specialties: ["family-governance", "succession-planning", "family-office"] },
  { name: "Eleanor",    role: "Wealth Transfer",              department: "Ultra Trust Agency", isClassified: true, team: "tier-1", reportsTo: "Victoria", model: "Claude Sonnet", provider: "Anthropic", specialties: ["wealth-transfer", "gifting", "inheritance"] },
  { name: "Helena",     role: "Private Banking",              department: "Ultra Trust Agency", isClassified: true, team: "tier-1", reportsTo: "Victoria", model: "Claude Sonnet", provider: "Anthropic", specialties: ["private-banking", "portfolio-management", "custody"] },
  { name: "Isabelle R.",role: "Compliance & Regulatory",      department: "Ultra Trust Agency", isClassified: true, team: "tier-1", reportsTo: "Victoria", model: "Claude Sonnet", provider: "Anthropic", specialties: ["compliance", "CRS/AEOI", "anti-money-laundering"] },
  { name: "James",      role: "Real Estate Trust",            department: "Ultra Trust Agency", isClassified: true, team: "tier-1", reportsTo: "Victoria", model: "Claude Sonnet", provider: "Anthropic", specialties: ["real-estate-trust", "property-holding", "reits"] },
  { name: "Lukas",      role: "Cross-Border Benelux",         department: "Ultra Trust Agency", isClassified: true, team: "tier-1", reportsTo: "Victoria", model: "Claude Sonnet", provider: "Anthropic", specialties: ["benelux", "cross-border", "nl-be-lu-structures"] },
  { name: "Margaret",   role: "Liechtenstein Foundation",     department: "Ultra Trust Agency", isClassified: true, team: "tier-1", reportsTo: "Victoria", model: "Claude Sonnet", provider: "Anthropic", specialties: ["liechtenstein-foundation", "stiftung", "asset-protection"] },
  { name: "Maximilian", role: "German Tax & Succession",      department: "Ultra Trust Agency", isClassified: true, team: "tier-1", reportsTo: "Victoria", model: "Claude Sonnet", provider: "Anthropic", specialties: ["german-tax", "succession", "erbschaftsteuer"] },
  { name: "Oliver",     role: "Swiss Holding Structures",     department: "Ultra Trust Agency", isClassified: true, team: "tier-1", reportsTo: "Victoria", model: "Claude Sonnet", provider: "Anthropic", specialties: ["swiss-holding", "ch-structures", "tax-optimization"] },
  { name: "Philippa",   role: "Art & Collectibles Trust",     department: "Ultra Trust Agency", isClassified: true, team: "tier-1", reportsTo: "Victoria", model: "Claude Sonnet", provider: "Anthropic", specialties: ["art-trust", "collectibles", "valuation"] },
  { name: "Raphael",    role: "Digital Assets & Crypto",      department: "Ultra Trust Agency", isClassified: true, team: "tier-1", reportsTo: "Victoria", model: "Claude Sonnet", provider: "Anthropic", specialties: ["digital-assets", "crypto-custody", "web3-structuring"] },
  { name: "Sebastian",  role: "Insurance & Risk",             department: "Ultra Trust Agency", isClassified: true, team: "tier-1", reportsTo: "Victoria", model: "Claude Sonnet", provider: "Anthropic", specialties: ["insurance", "risk-management", "captives"] },
  { name: "Theodore",   role: "Philanthropic Structures",     department: "Ultra Trust Agency", isClassified: true, team: "tier-1", reportsTo: "Victoria", model: "Claude Sonnet", provider: "Anthropic", specialties: ["philanthropy", "charitable-trusts", "foundations"] },
];

// ─── Whitelab helper ───────────────────────────────────────────────────────────
// Levert de team-set voor de gewenste editie.
// - "internal": volledige roster incl. classified afdelingen (eigen dev-omgeving)
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
