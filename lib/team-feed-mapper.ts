import type { Agent } from "../constants/team";

/** The shape of an agent received from the configurable MC team feed. */
export type FeedAgent = {
  name: string;
  role: string;
  department: string;
  departmentId?: string;
  isClassified?: number | boolean;
  isActive?: number | boolean;
  status?: string;
  currentTask?: string | null;
};

/**
 * Older MC rosters still call the Executive Office Manager "Elena".
 * This is a display identity migration, NOT a blanket rename: legal specialist
 * Elena Vasquez (and any other Elena outside that exact role/department) stays.
 */
export function canonicalAgentName(agent: FeedAgent): string {
  if (
    agent.name === "Elena" &&
    agent.department === "Executive Office" &&
    /\b(office manager|receptionist|receptioniste)\b/i.test(agent.role)
  ) {
    return "Nathalie";
  }
  return agent.name;
}

export function mergeFeedAgent(feed: FeedAgent, builtin?: Agent): Agent {
  return {
    name: canonicalAgentName(feed),
    role: feed.role,
    department: feed.department,
    isClassified: feed.isClassified ? true : builtin?.isClassified,
    model: builtin?.model,
    provider: builtin?.provider,
    team: builtin?.team,
    reportsTo: builtin?.reportsTo,
    specialties: builtin?.specialties,
    isOrchestrator: builtin?.isOrchestrator,
    isAddOn: builtin?.isAddOn,
  };
}

/** Prefer the real Nathalie record over a legacy Elena alias if both exist. */
export function mapTeamFeedAgents(feedAgents: FeedAgent[], builtinTeam: Agent[]): Agent[] {
  const builtinByName = new Map(builtinTeam.map(agent => [agent.name, agent]));
  const hasRealNathalie = feedAgents.some(agent =>
    agent.name === "Nathalie" && agent.department === "Executive Office"
  );

  return feedAgents
    .filter(agent => !(hasRealNathalie && agent.name !== canonicalAgentName(agent)))
    .map(agent => mergeFeedAgent(agent, builtinByName.get(canonicalAgentName(agent))));
}
