import { z } from "zod";
import { DEPARTMENTS, type Agent } from "../constants/team";

/** External MC records are untrusted until parsed at the boundary. */
export const feedAgentSchema = z.object({
  name: z.string().trim().min(1).max(128),
  role: z.string().trim().min(1).max(255),
  department: z.string().trim().min(1).max(128),
  departmentId: z.string().optional(),
  department_id: z.string().optional(),
  displayName: z.string().optional(),
  isClassified: z.union([z.number(), z.boolean()]).optional(),
  is_classified: z.union([z.number(), z.boolean()]).optional(),
  isActive: z.union([z.number(), z.boolean()]).optional(),
  is_active: z.union([z.number(), z.boolean()]).optional(),
  status: z.string().optional(),
  currentTask: z.string().nullable().optional(),
  current_task: z.string().nullable().optional(),
}).passthrough();

export const teamFeedSchema = z.object({
  edition: z.enum(["internal", "whitelab"]),
  count: z.number().int().nonnegative().optional(),
  agents: z.array(feedAgentSchema).max(500),
  directorySource: z.string().optional(),
  directoryVersion: z.union([z.number(), z.string()]).optional(),
  source: z.enum(["live", "stale"]).optional(),
  fetchedAt: z.string().optional(),
}).passthrough();

export type FeedAgent = z.infer<typeof feedAgentSchema>;
export type TeamFeed = z.infer<typeof teamFeedSchema>;

const departmentById = new Map(DEPARTMENTS.map(dept => [dept.id, dept.name]));
const departmentNames = new Set(DEPARTMENTS.map(dept => dept.name));

/** Whitelab requires both a known non-classified department and a public flag. */
export function whitelabVisible(agent: FeedAgent): boolean {
  const code = agent.department_id ?? agent.departmentId;
  const department = DEPARTMENTS.find(dept => dept.id === code || dept.name === agent.department);
  return !!department && !department.classified &&
    !Boolean(agent.is_classified ?? agent.isClassified);
}

/** Prefer the stable department code; legacy MC imports use different labels. */
export function canonicalDepartment(agent: FeedAgent): string {
  const id = agent.department_id ?? agent.departmentId;
  if (id && departmentById.has(id)) return departmentById.get(id)!;
  return agent.department;
}

function executiveManager(agent: FeedAgent): boolean {
  const executive = (agent.department_id ?? agent.departmentId) === "executive"
    || canonicalDepartment(agent) === "Executive Office";
  return executive && /\b(office manager|receptionist|receptioniste)\b/i.test(agent.role);
}

/** No blanket rename: the two JLC specialists are different agents. */
export function canonicalAgentName(agent: FeedAgent): string {
  return agent.name === "Elena" && executiveManager(agent) ? "Nathalie" : agent.name;
}

/**
 * One current record per logical Office Manager. If the real Nathalie exists,
 * discard only the old Executive Office Manager alias. Never merge legal names.
 */
export function canonicalizeFeedAgents(agents: FeedAgent[]): FeedAgent[] {
  const active = agents.filter(agent => agent.is_active !== 0 && agent.is_active !== false
    && agent.isActive !== 0 && agent.isActive !== false);
  const hasRealManager = active.some(agent => agent.name === "Nathalie" && executiveManager(agent));
  const seen = new Set<string>();
  return active.flatMap(agent => {
    if (hasRealManager && agent.name === "Elena" && executiveManager(agent)) return [];
    const name = canonicalAgentName(agent);
    const department = canonicalDepartment(agent);
    // A repeated canonical identity outside the explicit legacy alias is a
    // source-data error, not a reason to discard an unrelated agent silently.
    const key = `${agent.department_id ?? agent.departmentId ?? department}\0${name}`;
    if (seen.has(key)) throw new Error(`ambiguous_agent_identity: ${key.replace("\0", "/")}`);
    seen.add(key);
    return [{
      ...agent,
      name,
      department,
      departmentId: agent.department_id ?? agent.departmentId,
      // The MC source currently labels the JLC Elena Vasquez as another person.
      // Preserve the requested legal identity; never rewrite historical data.
      displayName: agent.name === "Elena Vasquez" ? "Elena Vasquez" :
        name !== agent.name ? name : agent.displayName,
      isClassified: agent.is_classified ?? agent.isClassified,
      isActive: agent.is_active ?? agent.isActive,
      currentTask: agent.current_task ?? agent.currentTask,
    }];
  });
}

export function mergeFeedAgent(feed: FeedAgent, builtin?: Agent): Agent {
  const classified = feed.isClassified ?? feed.is_classified;
  return {
    name: canonicalAgentName(feed),
    role: feed.role,
    department: canonicalDepartment(feed),
    isClassified: classified === undefined ? builtin?.isClassified : Boolean(classified),
    model: builtin?.model,
    provider: builtin?.provider,
    team: builtin?.team,
    reportsTo: builtin?.reportsTo,
    specialties: builtin?.specialties,
    isOrchestrator: builtin?.isOrchestrator,
    isAddOn: builtin?.isAddOn,
    status: feed.status,
    currentTask: feed.currentTask ?? feed.current_task ?? null,
  };
}

export function mapTeamFeedAgents(feedAgents: FeedAgent[], builtinTeam: Agent[]): Agent[] {
  const builtinByName = new Map(builtinTeam.map(agent => [agent.name, agent]));
  return canonicalizeFeedAgents(feedAgents).map(agent => mergeFeedAgent(agent, builtinByName.get(agent.name)));
}

/** Preserve previously unknown departments instead of hiding new agents. */
export function extraFeedDepartments(agents: Agent[]): string[] {
  return [...new Set(agents.map(agent => agent.department))]
    .filter(name => !departmentNames.has(name)).sort();
}
