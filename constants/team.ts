// ─── Higgins MC — Officieel Team Overzicht ────────────────────────────────────
// Carpe Diem GmbH · 43 Agents · 9 Departments

export type Agent = {
  name: string;
  role: string;
  department: string;
  isOrchestrator?: boolean;
  isAddOn?: boolean;
};

export const TEAM: Agent[] = [
  // ── Orchestrators ──────────────────────────────────────────────────────────
  { name: "Higgins", role: "COO / Chief of Staff",    department: "Orchestrators", isOrchestrator: true },
  { name: "Elena",   role: "Office Manager",           department: "Orchestrators", isOrchestrator: true },

  // ── Marketing Command ──────────────────────────────────────────────────────
  { name: "Gary",    role: "CMO / Chief Marketing Officer", department: "Marketing Command" },
  { name: "Bard",    role: "Copywriter",                    department: "Marketing Command" },
  { name: "Picasso", role: "Visual Designer",               department: "Marketing Command" },
  { name: "Echo",    role: "Social Media",                  department: "Marketing Command" },
  { name: "Anna",    role: "Analytics",                     department: "Marketing Command" },
  { name: "Larry",   role: "Viral Specialist",              department: "Marketing Command" },
  { name: "Flash",   role: "Content Producer",              department: "Marketing Command" },

  // ── Team Elon — IT ─────────────────────────────────────────────────────────
  { name: "Elon",     role: "CTO / Chief Technology Officer", department: "Team Elon — IT" },
  { name: "Oracle",   role: "Backend Engineer",               department: "Team Elon — IT" },
  { name: "Nano",     role: "AI Specialist",                  department: "Team Elon — IT" },
  { name: "Pixel",    role: "Frontend Developer",             department: "Team Elon — IT" },
  { name: "Shield",   role: "Security Engineer",              department: "Team Elon — IT" },
  { name: "Sentinel", role: "DevOps",                         department: "Team Elon — IT" },

  // ── Revenue ────────────────────────────────────────────────────────────────
  { name: "Warren",   role: "CFO / Chief Financial Officer", department: "Revenue" },
  { name: "Abacus",   role: "Bookkeeper",                    department: "Revenue" },
  { name: "Closer",   role: "Sales Agent",                   department: "Revenue" },
  { name: "Carson",   role: "Account Manager",               department: "Revenue" },
  { name: "Strategos",role: "Strategy Analyst",              department: "Revenue" },
  { name: "Fortuna",  role: "Financial Planner",             department: "Revenue" },

  // ── Specialists ────────────────────────────────────────────────────────────
  { name: "Catharina", role: "Research Specialist",    department: "Specialists" },
  { name: "Victoria",  role: "Head of Trust & Estate", department: "Specialists" },
  { name: "Barbara",   role: "Translator",             department: "Specialists" },
  { name: "Vera",      role: "Compliance Officer",     department: "Specialists" },
  { name: "Rosi",      role: "Community Bot",          department: "Specialists" },

  // ── Justitia Legal Council (Add-On) ────────────────────────────────────────
  { name: "Justitia", role: "CLO / Chief Legal Officer",       department: "Justitia Legal Council", isAddOn: true },
  { name: "Adrian",   role: "Corporate & Commercial Law",      department: "Justitia Legal Council", isAddOn: true },
  { name: "Isabelle", role: "International Tax & Treaty",      department: "Justitia Legal Council", isAddOn: true },
  { name: "Matteo",   role: "Litigation & Dispute Resolution", department: "Justitia Legal Council", isAddOn: true },
  { name: "Elena V.", role: "Immigration & Labor Law",         department: "Justitia Legal Council", isAddOn: true },
  { name: "Dr. Nadia",role: "Medical Regulatory & Compliance", department: "Justitia Legal Council", isAddOn: true },

  // ── Enterprise (Add-On) ────────────────────────────────────────────────────
  { name: "Hugo",   role: "HR Manager",               department: "Enterprise", isAddOn: true },
  { name: "Atlas",  role: "Data Scientist",            department: "Enterprise", isAddOn: true },
  { name: "Max",    role: "Product Manager",           department: "Enterprise", isAddOn: true },
  { name: "Oscar",  role: "Project Manager",           department: "Enterprise", isAddOn: true },
  { name: "Felix",  role: "Business Intelligence",     department: "Enterprise", isAddOn: true },
  { name: "Herald", role: "PR & Communications",       department: "Enterprise", isAddOn: true },

  // ── Web Solutions ──────────────────────────────────────────────────────────
  { name: "Leonardo", role: "Web Solutions Specialist", department: "Web Solutions" },

  // ── Einstein Research Lab (R&D) ──────────────────────────────────────────────
  { name: "Einstein", role: "Head of Research & Development", department: "Einstein Research Lab" },
  { name: "Curie",    role: "Applied AI Researcher",          department: "Einstein Research Lab" },
  { name: "Tesla",    role: "Prototype Engineer",            department: "Einstein Research Lab" },
  { name: "Turing",   role: "Algorithm Researcher",          department: "Einstein Research Lab" },
  { name: "Lovelace", role: "Data & Experimentation",        department: "Einstein Research Lab" },
  { name: "Newton",   role: "Innovation Analyst",            department: "Einstein Research Lab" },
];

// Kernteam voor Team Pulse weergave in de app (Orchestrators + afdelingshoofden)
export const PULSE_TEAM: Agent[] = [
  { name: "Higgins",  role: "COO / Chief of Staff",         department: "Orchestrators", isOrchestrator: true },
  { name: "Elena",    role: "Office Manager",                department: "Orchestrators", isOrchestrator: true },
  { name: "Gary",     role: "CMO / Chief Marketing Officer", department: "Marketing Command" },
  { name: "Elon",     role: "CTO / Chief Technology Officer",department: "Team Elon — IT" },
  { name: "Warren",   role: "CFO / Chief Financial Officer", department: "Revenue" },
  { name: "Justitia", role: "CLO / Chief Legal Officer",     department: "Justitia Legal Council", isAddOn: true },
  { name: "Leonardo", role: "Web Solutions Specialist",      department: "Web Solutions" },
  { name: "Einstein", role: "Head of Research & Development", department: "Einstein Research Lab" },
];
