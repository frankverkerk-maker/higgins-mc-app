import { z } from "zod";
import { DEPARTMENTS, type Agent, type DepartmentMeta, type Edition } from "../constants/team";

const departmentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  isClassified: z.boolean().optional(),
}).passthrough();
const buildingSchema = z.object({
  source: z.string().optional(),
  floors: z.array(z.object({
    floorNumber: z.number().int(),
    label: z.string().min(1),
    departments: z.array(departmentSchema),
  })).max(100),
});
const legacySchema = z.object({
  source: z.string().optional(),
  floors: z.array(z.object({
    floor_number: z.number().int(),
    floor_name: z.string().min(1),
    department_id: z.string().min(1),
    is_restricted: z.boolean().optional(),
  })).max(100),
});

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
  /** A mixed-use floor is not entirely restricted. */
  restricted: boolean;
}
export interface TowerProjection {
  floors: TowerFloor[];
  fromBuilding: boolean;
  totalAgents: number;
  departmentCount: number;
}

const FALLBACK_ORDER = [
  "executive", "einstein-lab", "finance", "technology", "marketing", "enterprise",
  "fmc", "jlc", "mtd", "uta", "task-force-ghost",
];

/** Convert either MC v2 grouped floors or the old one-department-per-floor data. */
export function projectTower(
  building: unknown,
  team: Agent[],
  departments: DepartmentMeta[],
  edition: Edition,
  freshTeam: boolean,
): TowerProjection {
  const grouped = buildingSchema.safeParse(building);
  const legacy = grouped.success ? null : legacySchema.safeParse(building);
  const knownById = new Map(DEPARTMENTS.map(department => [department.id, department]));
  const byName = new Map(departments.map(department => [department.name, department]));
  const raw = grouped.success
    ? grouped.data.floors.map(floor => ({
        number: floor.floorNumber,
        label: floor.label,
        ids: floor.departments.map(department => department.id),
      }))
    : legacy?.success
      ? legacy.data.floors.map(floor => ({ number: floor.floor_number, label: floor.floor_name, ids: [floor.department_id] }))
      : FALLBACK_ORDER.map((id, index) => ({
          number: index < 8 ? 8 - index : -(index - 7),
          label: knownById.get(id)?.name ?? id,
          ids: [id],
        }));
  const fromBuilding = grouped.success || !!legacy?.success;
  const floors = raw.flatMap(floor => {
    const groups: TowerDepartment[] = floor.ids.flatMap(id => {
      const meta = knownById.get(id) ?? departments.find(dept => dept.id === id);
      // Never expose unknown/secret departments in the client edition, even if
      // upstream flags them public (MC currently labels MTD/UTA that way).
      if (edition === "whitelab" && (!meta || meta.classified)) return [];
      const name = meta?.name ?? id;
      const agents = team.filter(agent => agent.department === name &&
        (edition !== "whitelab" || !agent.isClassified));
      return [{
        id, name, agents,
        activeCount: freshTeam ? agents.filter(agent => agent.status === "active" || agent.status === "busy").length : 0,
        classified: !!meta?.classified,
        head: byName.get(name)?.head ?? meta?.head,
      }];
    });
    if (!groups.length) return [];
    return [{
      number: floor.number,
      label: floor.label,
      departments: groups,
      totalAgents: groups.reduce((sum, group) => sum + group.agents.length, 0),
      activeCount: groups.reduce((sum, group) => sum + group.activeCount, 0),
      restricted: groups.every(group => group.classified),
    }];
  }).sort((a, b) => b.number - a.number);
  return {
    floors,
    fromBuilding,
    totalAgents: floors.reduce((sum, floor) => sum + floor.totalAgents, 0),
    departmentCount: floors.reduce((sum, floor) => sum + floor.departments.length, 0),
  };
}
