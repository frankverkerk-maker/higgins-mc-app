import { DEPARTMENTS, type Agent } from "../constants/team";
import { buildTowerFloors, getTowerAgentTotal } from "../lib/tower-model";
import { getCanonicalAgentDisplayName } from "../lib/team-pulse";

const FEED_URL = "https://higgins-dash-bbdpujw2.manus.space/api/app/team-feed";

type LiveAgent = {
  name: string;
  displayName?: string;
  role: string;
  department: string;
  department_id?: string;
  is_classified?: number | boolean;
};

async function main(): Promise<void> {
  const response = await fetch(`${FEED_URL}?tower-validation=${Date.now()}`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Team feed HTTP ${response.status}`);

  const payload = await response.json() as { count: number; agents: LiveAgent[] };
  const team: Agent[] = payload.agents.map((agent) => ({
    name: agent.name,
    displayName: agent.displayName,
    departmentId: agent.department_id,
    role: agent.role,
    department: agent.department,
    isClassified: Boolean(agent.is_classified),
  }));

  const floors = buildTowerFloors(team, DEPARTMENTS, true);
  const names = floors.flatMap((floor) => floor.agents.map((agent) =>
    getCanonicalAgentDisplayName(agent.name, agent.displayName)));

  const checks = {
    feedCount: payload.count === 88,
    floorCount: floors.length === 11,
    agentTotal: getTowerAgentTotal(floors) === 88,
    everyFloorPopulated: floors.every((floor) => floor.agents.length > 0),
    basementCount: floors.filter((floor) => floor.isRestricted).length === 3,
    morganCanonical: names.includes("Morgan") && !names.includes("Warren"),
    verifiedNames: ["Adrian Blackstone", "Sophia Adler", "Victoria Sterling", "Nathalie Vasquez"]
      .every((name) => names.includes(name)),
  };

  const failed = Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name);
  if (failed.length > 0) throw new Error(`Tower validation failed: ${failed.join(", ")}`);

  console.log(JSON.stringify({
    feedCount: payload.count,
    floorCount: floors.length,
    agentTotal: getTowerAgentTotal(floors),
    publicFloors: floors.filter((floor) => !floor.isRestricted).length,
    basements: floors.filter((floor) => floor.isRestricted).length,
    floors: floors.map((floor) => ({
      label: floor.floorNumber > 0 ? String(floor.floorNumber) : `B${Math.abs(floor.floorNumber)}`,
      departmentId: floor.departmentId,
      agents: floor.agents.length,
    })),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
