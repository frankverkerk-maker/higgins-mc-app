import { describe, it, expect } from "vitest";
import { getTeam } from "../constants/team";
import {
  canonicalAgentName,
  mapTeamFeedAgents,
  mergeFeedAgent,
  type FeedAgent,
} from "../lib/team-feed-mapper";

const builtinTeam = getTeam("internal");

// Representative payload returned by a configured Mission Control team feed.
const SAMPLE_FEED: FeedAgent[] = [
  { name: "Higgins", role: "Chief Operating Officer", department: "Executive Office", isClassified: 0, isActive: 1 },
  { name: "Elena", role: "Office Manager / Receptioniste", department: "Executive Office", isClassified: 0, isActive: 1 },
  { name: "Elena Vasquez", role: "International Law", department: "Justitia Legal Council", isClassified: 0, isActive: 1 },
  { name: "Morgan", role: "Head of Trading", department: "Morgan Trading Desk", isClassified: 1, isActive: 1 },
  { name: "BrandNewAgent", role: "Special Ops", department: "Executive Office", isClassified: 0, isActive: 1 },
];

describe("Higgins MC — Mission Control team feed mapping", () => {
  it("shows Nathalie as Office Manager even if the live feed is unavailable", () => {
    expect(builtinTeam.find(agent => agent.name === "Nathalie")).toMatchObject({
      role: "Office Manager / Receptioniste", department: "Executive Office",
    });
    expect(builtinTeam.find(agent => agent.name === "Elena Vasquez")).toMatchObject({
      role: "International Law", department: "Justitia Legal Council",
    });
  });

  it("maps the legacy Executive Office Manager Elena to Nathalie, retaining her actual role", () => {
    const merged = mapTeamFeedAgents(SAMPLE_FEED, builtinTeam);
    const officeManager = merged.find(agent => agent.role.startsWith("Office Manager"));
    expect(officeManager).toMatchObject({
      name: "Nathalie",
      role: "Office Manager / Receptioniste",
      department: "Executive Office",
      reportsTo: "Higgins",
    });
    expect(officeManager?.model).toBe(builtinTeam.find(agent => agent.name === "Nathalie")?.model);
    expect(merged.some(agent => agent.name === "Elena" && agent.department === "Executive Office")).toBe(false);
  });

  it("preserves the separate JLC lawyer Elena Vasquez without any name or role change", () => {
    const merged = mapTeamFeedAgents(SAMPLE_FEED, builtinTeam);
    expect(merged.find(agent => agent.name === "Elena Vasquez")).toMatchObject({
      role: "International Law",
      department: "Justitia Legal Council",
      reportsTo: "Justitia",
    });
  });

  it("does not rename another Elena in the legal council or a different executive role", () => {
    const legalElena = { name: "Elena", role: "Office Manager", department: "Justitia Legal Council" };
    const analystElena = { name: "Elena", role: "Operations Analyst", department: "Executive Office" };
    expect(canonicalAgentName(legalElena)).toBe("Elena");
    expect(canonicalAgentName(analystElena)).toBe("Elena");
  });

  it("prefers an actual Nathalie record over a stale alias without double-counting", () => {
    const realNathalie: FeedAgent = { name: "Nathalie", role: "Office Manager", department: "Executive Office" };
    const merged = mapTeamFeedAgents([...SAMPLE_FEED, realNathalie], builtinTeam);
    expect(merged.filter(agent => agent.name === "Nathalie")).toEqual([
      expect.objectContaining({ role: "Office Manager" }),
    ]);
    expect(merged).toHaveLength(SAMPLE_FEED.length);
  });

  it("preserves the feed's roles/departments and enriches known agents with builtin metadata", () => {
    const merged = mapTeamFeedAgents(SAMPLE_FEED, builtinTeam);
    expect(merged[0]).toMatchObject({ name: "Higgins", role: "Chief Operating Officer", department: "Executive Office", model: "Claude Opus", provider: "Anthropic" });
    expect(merged.find(agent => agent.name === "Morgan")?.isClassified).toBe(true);
  });

  it("accepts unknown agents and preserves whitelabel classified filtering", () => {
    const merged = mapTeamFeedAgents(SAMPLE_FEED, builtinTeam);
    const unknown = merged.find(agent => agent.name === "BrandNewAgent");
    expect(unknown?.model).toBeUndefined();
    expect(unknown?.isClassified).toBeFalsy();
    expect(merged.filter(agent => !agent.isClassified).some(agent => agent.name === "Morgan")).toBe(false);
  });

  it("leaves a real Nathalie unchanged when no legacy alias exists", () => {
    const realNathalie: FeedAgent = { name: "Nathalie", role: "Office Manager", department: "Executive Office" };
    expect(mergeFeedAgent(realNathalie, builtinTeam.find(agent => agent.name === "Nathalie"))).toMatchObject({
      name: "Nathalie", role: "Office Manager", department: "Executive Office",
    });
  });
});
