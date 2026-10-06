import { describe, expect, it } from "vitest";
import { DEPARTMENTS, type Agent } from "../constants/team";
import { projectTower } from "../lib/tower-directory";

const agents: Agent[] = [
  { name: "Nathalie", department: "Executive Office", role: "Office Manager / Receptioniste", status: "active" },
  { name: "Elena Vasquez", department: "Justitia Legal Council", role: "Legal Researcher", status: "active" },
  { name: "Nathalie Vasquez", department: "Justitia Legal Council", role: "Legal Researcher", status: "standby" },
  { name: "Elon", department: "Technology Division", role: "CTO", status: "active" },
  { name: "Morgan", department: "Morgan Trading Desk", role: "Trader", status: "active", isClassified: true },
  { name: "Victoria", department: "Ultra Trust Agency", role: "Trust", status: "active", isClassified: true },
];
const building = {
  source: "live",
  floors: [
    { floorNumber: 1, label: "Floor 1", departments: [
      { id: "executive", name: "Executive", agentCount: 9, activeCount: 8, isClassified: false },
    ] },
    { floorNumber: 2, label: "Floor 2", departments: [
      { id: "jlc", name: "Jlc", agentCount: 7, activeCount: 7, isClassified: false },
      { id: "mtd", name: "Morgan Trading Desk", agentCount: 6, activeCount: 6, isClassified: false },
    ] },
    { floorNumber: 3, label: "Floor 3", departments: [
      { id: "technology", name: "Technology", agentCount: 7, activeCount: 7, isClassified: false },
      { id: "uta", name: "Ultra Trust Agency", agentCount: 23, activeCount: 23, isClassified: false },
    ] },
  ],
};

describe("MC Tower directory contract", () => {
  it("renders three genuine floors with canonical agents, not BNaN or 0 agents", () => {
    const tower = projectTower(building, agents, DEPARTMENTS, "internal", true);
    expect(tower).toMatchObject({ fromBuilding: true, totalAgents: 6, departmentCount: 5 });
    expect(tower.floors.map(floor => floor.number)).toEqual([3, 2, 1]);
    expect(tower.floors.every(floor => Number.isInteger(floor.number))).toBe(true);
    expect(tower.floors.find(floor => floor.number === 2)?.departments[0]).toMatchObject({
      id: "jlc", name: "Justitia Legal Council", activeCount: 1,
      agents: [expect.objectContaining({ name: "Elena Vasquez" }), expect.objectContaining({ name: "Nathalie Vasquez" })],
    });
    expect(tower.floors.find(floor => floor.number === 1)?.departments[0].agents.map(agent => agent.name))
      .toEqual(["Nathalie"]);
  });

  it("hides MTD and UTA in whitelab despite incorrect upstream public flags", () => {
    const contaminated = [...agents, { name: "Secret", department: "Executive Office", role: "Analyst", isClassified: true }];
    const tower = projectTower(building, contaminated, DEPARTMENTS, "whitelab", true);
    expect(tower.totalAgents).toBe(4);
    expect(tower.departmentCount).toBe(3);
    expect(tower.floors.flatMap(floor => floor.departments.flatMap(group => group.agents.map(agent => agent.name)))).not.toContain("Secret");
    expect(tower.floors.flatMap(floor => floor.departments.map(group => group.id))).not.toContain("uta");
    expect(tower.floors.flatMap(floor => floor.departments.map(group => group.id))).not.toContain("mtd");
    expect(tower.floors.every(floor => !floor.restricted)).toBe(true);
  });

  it("does not claim live activity for stale or built-in data", () => {
    const tower = projectTower(building, agents, DEPARTMENTS, "internal", false);
    expect(tower.totalAgents).toBe(6);
    expect(tower.floors.every(floor => floor.activeCount === 0)).toBe(true);
  });

  it("handles old one-department floors during a compatible migration", () => {
    const tower = projectTower({ source: "database", floors: [
      { floor_number: 8, floor_name: "Executive Suite", department_id: "executive", is_restricted: false },
      { floor_number: -1, floor_name: "Trading", department_id: "mtd", is_restricted: true },
    ] }, agents, DEPARTMENTS, "whitelab", true);
    expect(tower).toMatchObject({ fromBuilding: true, totalAgents: 1, departmentCount: 1 });
    expect(tower.floors.map(floor => floor.number)).toEqual([8]);
  });

  it("rejects malformed building data and falls back without false MC-source claim", () => {
    const tower = projectTower({ source: "live", floors: [{ floorNumber: "none" }] },
      agents, DEPARTMENTS, "internal", false);
    expect(tower.fromBuilding).toBe(false);
    expect(tower.floors).toHaveLength(11);
    expect(tower.floors.every(floor => Number.isFinite(floor.number))).toBe(true);
    expect(tower.totalAgents).toBe(agents.length);
  });
});
