import { describe, expect, it } from "vitest";
import { DEPARTMENTS, TEAM, type Agent } from "../constants/team";
import { buildTowerFloors, formatTowerFloorNumber, getTowerAgentTotal } from "./tower-model";
import { getCanonicalAgentDisplayName } from "./team-pulse";

const DEPARTMENT_ID_BY_NAME = new Map(DEPARTMENTS.map((department) => [department.name, department.id]));

function buildLiveLikeTeam(): Agent[] {
  return TEAM.map((agent) => ({
    ...agent,
    departmentId: DEPARTMENT_ID_BY_NAME.get(agent.department),
  }));
}

describe("Higgins Tower normalized model", () => {
  const floors = buildTowerFloors(buildLiveLikeTeam(), DEPARTMENTS, true);

  it("restores all eleven departments and all 88 agents", () => {
    expect(floors).toHaveLength(11);
    expect(getTowerAgentTotal(floors)).toBe(88);
    expect(floors.every((floor) => floor.agents.length > 0)).toBe(true);
  });

  it("uses eight public floors and three ordered classified basements", () => {
    expect(floors.filter((floor) => !floor.isRestricted)).toHaveLength(8);
    expect(floors.filter((floor) => floor.isRestricted).map((floor) => floor.floorNumber))
      .toEqual([-1, -2, -3]);
    expect(floors.at(-1)?.departmentId).toBe("task-force-ghost");
  });

  it("never emits NaN or an invalid basement label", () => {
    for (const floor of floors) {
      expect(Number.isFinite(floor.floorNumber)).toBe(true);
      expect(formatTowerFloorNumber(floor.floorNumber)).not.toMatch(/NaN/);
    }
    expect(formatTowerFloorNumber(Number.NaN)).toBe("—");
  });

  it("keeps Morgan canonical while retaining raw Warren compatibility", () => {
    const finance = floors.find((floor) => floor.departmentId === "finance")!;
    const rawWarren = finance.agents.find((agent) => agent.name === "Warren")!;
    expect(rawWarren.name).toBe("Warren");
    expect(getCanonicalAgentDisplayName(rawWarren.name, rawWarren.displayName)).toBe("Morgan");
  });

  it("renders the verified JLC, FMC, and UTA identities in expanded floors", () => {
    const names = floors.flatMap((floor) => floor.agents.map((agent) =>
      getCanonicalAgentDisplayName(agent.name, agent.displayName)));
    expect(names).toContain("Adrian Blackstone");
    expect(names).toContain("Sophia Adler");
    expect(names).toContain("Victoria Sterling");
    expect(names).toContain("Nathalie Vasquez");
  });

  it("hides all classified basements for whitelabel editions", () => {
    const publicFloors = buildTowerFloors(buildLiveLikeTeam().filter((agent) => !agent.isClassified), DEPARTMENTS, false);
    expect(publicFloors).toHaveLength(8);
    expect(publicFloors.some((floor) => floor.isRestricted)).toBe(false);
  });
});
