type AgentActivity = { status?: string | null };

const LIVE_STATUSES = new Set(["active", "busy", "working", "processing"]);

const VERIFIED_FULL_NAMES: Readonly<Record<string, string>> = Object.freeze({
  Adrian: "Adrian Blackstone",
  "Elena Vasquez": "Nathalie Vasquez",
  Isabelle: "Isabelle Laurent",
  Matteo: "Matteo Bellini",
  Nadia: "Nadia Okonkwo",
  David: "David Sinclair",
  Akiko: "Akiko Iwasaki",
  Maria: "Maria Blasco",
  Rosalind: "Rosalind Franklin",
  Samuel: "Samuel Hahnemann",
  Siddhartha: "Siddhartha Mukherjee",
  Sophia: "Sophia Adler",
  Vladimir: "Vladimir Khavinson",
  Victoria: "Victoria Sterling",
  Alexander: "Alexander Whitfield",
  Arabella: "Arabella Blackwood",
  Benedict: "Benedict Hargreaves",
  Charlotte: "Charlotte Pemberton",
  Eleanor: "Eleanor Ashworth",
  Helena: "Helena Von Liechtenstein",
  "Isabelle R.": "Isabelle Ritter",
  James: "James Worthington",
  Lukas: "Lukas Van Der Berg",
  Margaret: "Margaret Frick",
  Maximilian: "Maximilian Von Hessen",
  Oliver: "Oliver Hartmann",
  Philippa: "Philippa Cavendish",
  Raphael: "Raphael Zimmermann",
  Sebastian: "Sebastian Kessler",
  Theodore: "Theodore Brunner",
});

/** Count only agents that are actually working; standby/idle agents remain rostered but not active. */
export function countActiveAgents(activity: Record<string, AgentActivity>): number {
  return Object.values(activity).filter((entry) =>
    LIVE_STATUSES.has(String(entry?.status ?? "").toLowerCase())
  ).length;
}

/**
 * Warren remains a raw compatibility key for historic data and routing only.
 * Every user-facing surface uses the canonical Morgan name.
 */
export function getCanonicalAgentDisplayName(name: string, verifiedDisplayName?: string | null): string {
  const candidate = verifiedDisplayName?.trim() || VERIFIED_FULL_NAMES[name] || name;
  return candidate.trim().toLowerCase() === "warren" ? "Morgan" : candidate;
}
