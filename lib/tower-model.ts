import type { Agent, DepartmentMeta } from "../constants/team";

export type TowerFloor = {
  floorNumber: number;
  floorName: string;
  departmentId: string;
  description: string;
  isRestricted: boolean;
  agents: Agent[];
};

type FloorDefinition = Omit<TowerFloor, "agents">;

export const TOWER_FLOOR_DEFINITIONS: FloorDefinition[] = [
  { floorNumber: 8, floorName: "Penthouse — Executive Suite", departmentId: "executive", description: "Directie, coördinatie en directe lijnen naar alle afdelingen.", isRestricted: false },
  { floorNumber: 7, floorName: "Einstein Research Lab", departmentId: "einstein-lab", description: "Wetenschappelijk onderzoek, innovatie en geavanceerde analyse.", isRestricted: false },
  { floorNumber: 6, floorName: "Finance & Revenue", departmentId: "finance", description: "Financiële strategie, analyse, sales en revenue operations.", isRestricted: false },
  { floorNumber: 5, floorName: "Technology Division", departmentId: "technology", description: "Architectuur, engineering, infrastructuur en beveiliging.", isRestricted: false },
  { floorNumber: 4, floorName: "Marketing & Creative", departmentId: "marketing", description: "Merkstrategie, content, media en groeiprogramma's.", isRestricted: false },
  { floorNumber: 3, floorName: "Enterprise Operations", departmentId: "enterprise", description: "Operations, kwaliteit, compliance, programma's en klantbeleving.", isRestricted: false },
  { floorNumber: 2, floorName: "Functional Medicine Center", departmentId: "fmc", description: "Diagnostiek, longevity science en integratieve geneeskunde.", isRestricted: false },
  { floorNumber: 1, floorName: "Justitia Legal Council", departmentId: "jlc", description: "Juridische strategie, contracten, IP, privacy en compliance.", isRestricted: false },
  { floorNumber: -1, floorName: "Basement 1 — Morgan Trading Desk", departmentId: "mtd", description: "Tradingstrategie, signalen, risico en beveiligde uitvoering.", isRestricted: true },
  { floorNumber: -2, floorName: "Basement 2 — Ultra Trust Agency", departmentId: "uta", description: "Truststructuren, governance, vermogensplanning en risk oversight.", isRestricted: true },
  { floorNumber: -3, floorName: "Basement 3 — Task Force Ghost", departmentId: "task-force-ghost", description: "Afgeschermde intelligence en speciale operaties.", isRestricted: true },
];

function belongsToDepartment(agent: Agent, department: DepartmentMeta): boolean {
  return agent.departmentId === department.id || (!agent.departmentId && agent.department === department.name);
}

export function buildTowerFloors(
  team: Agent[],
  departments: DepartmentMeta[],
  includeRestricted: boolean,
): TowerFloor[] {
  const departmentById = new Map(departments.map((department) => [department.id, department]));

  return TOWER_FLOOR_DEFINITIONS
    .filter((definition) => includeRestricted || !definition.isRestricted)
    .map((definition) => {
      const department = departmentById.get(definition.departmentId);
      const agents = department
        ? team.filter((agent) => belongsToDepartment(agent, department))
        : [];

      return { ...definition, agents };
    })
    .sort((a, b) => b.floorNumber - a.floorNumber);
}

export function getTowerAgentTotal(floors: TowerFloor[]): number {
  return floors.reduce((total, floor) => total + floor.agents.length, 0);
}

export function formatTowerFloorNumber(floorNumber: number): string {
  if (!Number.isFinite(floorNumber) || floorNumber === 0) return "—";
  return floorNumber > 0 ? String(floorNumber) : `B${Math.abs(floorNumber)}`;
}
