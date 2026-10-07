import { DEPARTMENTS, type Agent, type DepartmentMeta, type Edition } from "../constants/team";

export interface TowerDepartment {
  id: string;
  name: string;
  agents: Agent[];
  activeCount: number;
  classified: boolean;
  head?: string;
}
export interface TowerFloor {
  number: number;
  label: string;
  departments: TowerDepartment[];
  totalAgents: number;
  activeCount: number;
  restricted: boolean;
}
export interface TowerProjection {
  floors: TowerFloor[];
  totalAgents: number;
  departmentCount: number;
}

/**
 * Higgins Tower is a product/domain model: eight public levels and three
 * classified basements. MC's getBuilding groups these departments into three
 * technical floors; its floor numbers are *not* the Tower's floor numbers.
 * Only the agent directory is live. Do not change this mapping from an MC
 * building response without an explicit versioned Tower contract.
 */
const TOWER_LEVELS = [
  { id: "executive", number: 8 },
  { id: "einstein-lab", number: 7 },
  { id: "finance", number: 6 },
  { id: "technology", number: 5 },
  { id: "marketing", number: 4 },
  { id: "enterprise", number: 3 },
  { id: "fmc", number: 2 },
  { id: "jlc", number: 1 },
  { id: "mtd", number: -1 },
  { id: "uta", number: -2 },
  { id: "task-force-ghost", number: -3 },
] as const;

export function projectTower(
  team: Agent[],
  departments: DepartmentMeta[],
  edition: Edition,
  freshTeam: boolean,
  otherDepartmentsLabel = "Nieuwe afdelingen",
): TowerProjection {
  const byId = new Map(DEPARTMENTS.map(department => [department.id, department]));
  const byName = new Map(departments.map(department => [department.name, department]));
  const floors: TowerFloor[] = TOWER_LEVELS.flatMap(level => {
    const meta = byId.get(level.id)!;
    if (edition === "whitelab" && meta.classified) return [];
    const agents = team.filter(agent => agent.department === meta.name &&
      (edition !== "whitelab" || !agent.isClassified));
    const activeCount = freshTeam
      ? agents.filter(agent => agent.status === "active" || agent.status === "busy").length
      : 0;
    const group: TowerDepartment = {
      id: level.id,
      name: meta.name,
      agents,
      activeCount,
      classified: !!meta.classified,
      head: byName.get(meta.name)?.head ?? meta.head,
    };
    return [{
      number: level.number,
      label: meta.name,
      departments: [group],
      totalAgents: agents.length,
      activeCount,
      restricted: group.classified,
    }];
  });
  // A newly introduced department remains visible internally until its Tower
  // position is intentionally assigned. Unknown departments fail closed for
  // whitelabel, consistent with the canonical directory boundary.
  const otherNames = edition === "internal"
    ? [...new Set(team.map(agent => agent.department))].filter(name =>
        !DEPARTMENTS.some(department => department.name === name)).sort()
    : [];
  if (otherNames.length) {
    const groups: TowerDepartment[] = otherNames.map(name => {
      const agents = team.filter(agent => agent.department === name);
      return {
        id: byName.get(name)?.id ?? `external:${name}`,
        name,
        agents,
        activeCount: freshTeam ? agents.filter(agent => agent.status === "active" || agent.status === "busy").length : 0,
        classified: false,
        head: byName.get(name)?.head,
      };
    });
    floors.splice(8, 0, {
      number: 0,
      label: otherDepartmentsLabel,
      departments: groups,
      totalAgents: groups.reduce((sum, group) => sum + group.agents.length, 0),
      activeCount: groups.reduce((sum, group) => sum + group.activeCount, 0),
      restricted: false,
    });
  }
  return {
    floors,
    totalAgents: floors.reduce((sum, floor) => sum + floor.totalAgents, 0),
    departmentCount: floors.reduce((sum, floor) => sum + floor.departments.length, 0),
  };
}
