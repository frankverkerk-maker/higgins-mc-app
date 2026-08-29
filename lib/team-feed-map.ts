import {
  getTeam,
  getDepartments,
  type Agent,
  type DepartmentMeta,
  type Edition,
} from "../constants/team";
import { getCanonicalAgentDisplayName } from "./team-pulse";

export type FeedAgent = {
  name: string;
  displayName?: string;
  role: string;
  department: string;
  departmentId?: string;
  department_id?: string;
  isClassified?: number | boolean;
  isActive?: number | boolean;
  status?: string;
  currentTask?: string | null;
  reportsToDisplayName?: string | null;
  model?: string;
  provider?: string;
};

export type FeedResponse = {
  edition: Edition;
  count: number;
  agents: FeedAgent[];
};

function identityKeys(name: string, displayName?: string | null): string[] {
  const raw = name.trim().toLowerCase();
  const canonical = getCanonicalAgentDisplayName(name, displayName).trim().toLowerCase();
  return raw === canonical ? [raw] : [raw, canonical];
}

function mergeFeedAgent(builtin: Agent, feed?: FeedAgent): Agent {
  const department = getDepartments("internal").find((entry) => entry.name === builtin.department);
  return {
    ...builtin,
    name: builtin.name,
    displayName: getCanonicalAgentDisplayName(builtin.name, feed?.displayName),
    departmentId: department?.id ?? feed?.departmentId ?? feed?.department_id,
    role: feed?.role?.trim() || builtin.role,
    department: builtin.department,
    isClassified: builtin.isClassified,
    model: feed?.model?.trim() || builtin.model,
    provider: feed?.provider?.trim() || builtin.provider,
    reportsToDisplayName: feed?.reportsToDisplayName ?? builtin.reportsToDisplayName,
  };
}

/**
 * Overlay live MC metadata onto the canonical roster.
 * Unknown feed rows are intentionally ignored: services and pipelines are not agents.
 */
export function mapPayload(data: FeedResponse): {
  team: Agent[];
  departments: DepartmentMeta[];
  edition: Edition;
} {
  const edition: Edition = data.edition === "whitelab" ? "whitelab" : "internal";
  const feedByRawName = new Map<string, FeedAgent>();
  const feedByIdentity = new Map<string, FeedAgent>();
  for (const feedAgent of data.agents) {
    const rawKey = feedAgent.name.trim().toLowerCase();
    if (!feedByRawName.has(rawKey)) feedByRawName.set(rawKey, feedAgent);
    for (const key of identityKeys(feedAgent.name, feedAgent.displayName)) {
      if (!feedByIdentity.has(key)) feedByIdentity.set(key, feedAgent);
    }
  }
  const canonicalTeam = getTeam(edition);
  return {
    team: canonicalTeam.map((builtin) => {
      const exactRawMatch = feedByRawName.get(builtin.name.trim().toLowerCase());
      const aliasMatch = identityKeys(builtin.name, builtin.displayName)
        .map((key) => feedByIdentity.get(key))
        .find((candidate): candidate is FeedAgent => Boolean(candidate));
      const feed = exactRawMatch ?? aliasMatch;
      return mergeFeedAgent(builtin, feed);
    }),
    departments: getDepartments(edition),
    edition,
  };
}
