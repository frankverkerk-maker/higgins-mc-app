import { describe, expect, it } from "vitest";
import { DEPARTMENTS, getTeam, type Agent } from "../constants/team";
import { projectTower } from "../lib/tower-directory";

const agents: Agent[] = [
  { name: "Nathalie", department: "Executive Office", role: "Office Manager / Receptioniste", status: "active" },
  { name: "Elena Vasquez", department: "Justitia Legal Council", role: "Legal Researcher", status: "active" },
  { name: "Nathalie Vasquez", department: "Justitia Legal Council", role: "Legal Researcher", status: "standby" },
  { name: "Elon", department: "Technology Division", role: "CTO", status: "active" },
  { name: "Morgan", department: "Morgan Trading Desk", role: "Trader", status: "active", isClassified: true },
  { name: "Victoria", department: "Ultra Trust Agency", role: "Trust", status: "active", isClassified: true },
];
const towerNumbers = [8, 7, 6, 5, 4, 3, 2, 1, -1, -2, -3];

describe("Higgins Tower: 11 vaste afdelingsniveaus", () => {
  it("preserves the full product Tower regardless of MC's unrelated 3-floor building schema", () => {
    const tower = projectTower(agents, DEPARTMENTS, "internal", true);
    expect(tower).toMatchObject({ totalAgents: 6, departmentCount: 11 });
    expect(tower.floors.map(floor => floor.number)).toEqual(towerNumbers);
    expect(tower.floors.map(floor => floor.label)).toEqual(DEPARTMENTS.map(department => department.name));
    expect(tower.floors.find(floor => floor.number === 8)?.departments[0].agents.map(agent => agent.name))
      .toEqual(["Nathalie"]);
    expect(tower.floors.find(floor => floor.number === 1)?.departments[0].agents.map(agent => agent.name))
      .toEqual(["Elena Vasquez", "Nathalie Vasquez"]);
  });

  it("keeps all 11 levels even if the live directory is temporarily empty", () => {
    const tower = projectTower([], DEPARTMENTS, "internal", false);
    expect(tower.floors.map(floor => floor.number)).toEqual(towerNumbers);
    expect(tower.totalAgents).toBe(0);
    expect(tower.floors.every(floor => Number.isFinite(floor.number))).toBe(true);
  });

  it("whitelab shows only eight public levels, never classified data", () => {
    const contaminated = [...agents, { name: "Secret", department: "Executive Office", role: "Analyst", isClassified: true }];
    const tower = projectTower(contaminated, DEPARTMENTS, "whitelab", true);
    expect(tower.floors.map(floor => floor.number)).toEqual(towerNumbers.slice(0, 8));
    expect(tower.totalAgents).toBe(4);
    expect(tower.floors.flatMap(floor => floor.departments.flatMap(group => group.agents.map(agent => agent.name)))).not.toContain("Secret");
    expect(tower.floors.every(floor => !floor.restricted)).toBe(true);
  });

  it("does not claim current activity from stale or offline agent data", () => {
    const tower = projectTower(agents, DEPARTMENTS, "internal", false);
    expect(tower.totalAgents).toBe(6);
    expect(tower.floors.every(floor => floor.activeCount === 0)).toBe(true);
    expect(projectTower(agents, DEPARTMENTS, "internal", true).floors.find(floor => floor.number === 8)?.activeCount).toBe(1);
  });

  it("assigns new internal departments a separate level without renumbering the 11 established ones", () => {
    const team = [...agents, { name: "New Expert", role: "Specialist", department: "Innovation" }];
    const meta = [...DEPARTMENTS, { id: "external:Innovation", name: "Innovation", head: "New Expert" }];
    const tower = projectTower(team, meta, "internal", false, "New departments");
    expect(tower.floors.map(floor => floor.number)).toEqual([...towerNumbers.slice(0, 8), 0, ...towerNumbers.slice(8)]);
    expect(tower.floors.find(floor => floor.number === 0)?.label).toBe("New departments");
    expect(tower.totalAgents).toBe(7);
    expect(projectTower(team, meta, "whitelab", false).floors).toHaveLength(8);
  });

  it("retains the known 88-agent built-in roster with the same 11 levels when MC is unavailable", () => {
    const tower = projectTower(getTeam("internal"), DEPARTMENTS, "internal", false);
    expect(tower.floors).toHaveLength(11);
    expect(tower.totalAgents).toBe(getTeam("internal").length);
  });
});
