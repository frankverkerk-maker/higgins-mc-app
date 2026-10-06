import { describe, expect, it } from "vitest";
import { getTeam } from "../constants/team";
import {
  canonicalizeFeedAgents,
  effectiveTeamEdition,
  mapTeamFeedAgents,
  teamFeedSchema,
  type FeedAgent,
} from "../lib/team-feed-mapper";

const mcRecords: FeedAgent[] = [
  { name: "Higgins", role: "Chief Operating Officer", department: "Executive Office", department_id: "executive", is_active: 1 },
  { name: "Elena", displayName: "Elena", role: "Office Manager / Receptioniste", department: "Executive Office", department_id: "executive", is_active: 1 },
  { name: "Nathalie", displayName: "Nathalie", role: "Office Manager / Receptioniste", department: "Executive", department_id: "executive", is_active: 1, status: "active", current_task: "Vergadering organiseren" },
  { name: "Elena Vasquez", displayName: "Nathalie Vasquez", role: "Lex Researcher", department: "Justitia Legal Council", department_id: "jlc", is_active: 1 },
  { name: "Nathalie Vasquez", displayName: "Nathalie Vasquez", role: "Lex Researcher", department: "Jlc", department_id: "jlc", is_active: 1 },
  { name: "Curie", role: "Scientist", department: "Einstein Lab", department_id: "einstein-lab", is_active: 1 },
  { name: "Forge", role: "Engineer", department: "Technology", department_id: "technology", is_active: 1 },
  { name: "Samuel", role: "Physician", department: "Functional Medicine Council", department_id: "fmc", is_active: 1 },
  { name: "OfflineAgent", role: "Inactive", department: "Executive Office", department_id: "executive", is_active: 0 },
];

describe("MC directory contract v2", () => {
  it("never widens a local whitelab edition from a remote internal response", () => {
    expect(effectiveTeamEdition("whitelab", "internal")).toBe("whitelab");
    expect(effectiveTeamEdition("internal", "whitelab")).toBe("whitelab");
    expect(effectiveTeamEdition("internal", "internal")).toBe("internal");
  });

  it("selects the real Office Manager in Executive even when the old alias occurs first", () => {
    const agents = canonicalizeFeedAgents(mcRecords);
    expect(agents).toHaveLength(mcRecords.length - 2); // legacy Elena and inactive agent
    expect(agents.filter(agent => agent.name === "Nathalie")).toEqual([
      expect.objectContaining({ name: "Nathalie", department: "Executive Office", departmentId: "executive" }),
    ]);
    expect(agents.some(agent => agent.name === "Elena")).toBe(false);
    expect(agents.some(agent => agent.name === "OfflineAgent")).toBe(false);
  });

  it("preserves both distinct JLC agents and overrides a misleading displayName", () => {
    const agents = canonicalizeFeedAgents(mcRecords);
    expect(agents.filter(agent => agent.department === "Justitia Legal Council").map(agent => [agent.name, agent.displayName]))
      .toEqual([["Elena Vasquez", "Elena Vasquez"], ["Nathalie Vasquez", "Nathalie Vasquez"]]);
    const team = mapTeamFeedAgents(mcRecords, getTeam("internal"));
    expect(team.filter(agent => agent.department === "Justitia Legal Council").map(agent => agent.name))
      .toEqual(["Elena Vasquez", "Nathalie Vasquez"]);
  });

  it("normalizes MC department variants by stable department_id, not their free text label", () => {
    const team = mapTeamFeedAgents(mcRecords, getTeam("internal"));
    expect(team.find(agent => agent.name === "Nathalie")).toMatchObject({ status: "active", currentTask: "Vergadering organiseren" });
    expect(team.find(agent => agent.name === "Forge")?.department).toBe("Technology Division");
    expect(team.find(agent => agent.name === "Samuel")?.department).toBe("Functional Medicine Center");
  });

  it("uses the legacy manager as a bridge only when no real Nathalie exists", () => {
    const agents = canonicalizeFeedAgents(mcRecords.filter(agent => agent.name !== "Nathalie"));
    expect(agents.find(agent => agent.name === "Nathalie")).toMatchObject({
      role: "Office Manager / Receptioniste", department: "Executive Office", displayName: "Nathalie",
    });
  });

  it("does not reinterpret non-manager Elena or any JLC names", () => {
    const agents = canonicalizeFeedAgents([
      { name: "Elena", role: "Research Director", department: "Executive", department_id: "executive" },
      { name: "Elena", role: "Office Manager", department: "Jlc", department_id: "jlc" },
    ]);
    expect(agents.map(agent => agent.name)).toEqual(["Elena", "Elena"]);
  });

  it("rejects invalid and ambiguous upstream data instead of silently fabricating a team", () => {
    expect(teamFeedSchema.safeParse({ edition: "internal", agents: [{ name: "", role: "Manager", department: "Executive" }] }).success).toBe(false);
    expect(teamFeedSchema.safeParse({ edition: "internal", agents: [] }).success).toBe(true);
    expect(() => canonicalizeFeedAgents([mcRecords[2], mcRecords[2]])).toThrow(/ambiguous_agent_identity/);
  });
});
