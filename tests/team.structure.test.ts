import { describe, it, expect } from "vitest";
import { TEAM, PULSE_TEAM, type Agent } from "../constants/team";

// These tests lock in the full FMC team structure shown in Team Pulse.
// They guard against accidental removal of newly added departments/agents.

describe("Higgins MC team structure", () => {
  it("includes Leonardo as Web Solutions Specialist in the Web Solutions department", () => {
    const leonardo = TEAM.find((a: Agent) => a.name === "Leonardo");
    expect(leonardo).toBeDefined();
    expect(leonardo?.department).toBe("Web Solutions");
    expect(leonardo?.role).toBe("Web Solutions Specialist");
  });

  it("includes an Einstein Research Lab department with Einstein as its head", () => {
    const labAgents = TEAM.filter((a: Agent) => a.department === "Einstein Research Lab");
    expect(labAgents.length).toBeGreaterThanOrEqual(1);
    const einstein = labAgents.find((a: Agent) => a.name === "Einstein");
    expect(einstein).toBeDefined();
    expect(einstein?.role).toContain("Research");
  });

  it("has unique agent names (no duplicates)", () => {
    const names = TEAM.map((a: Agent) => a.name);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });

  it("every agent has a non-empty name, role and department", () => {
    for (const a of TEAM) {
      expect(a.name.trim().length).toBeGreaterThan(0);
      expect(a.role.trim().length).toBeGreaterThan(0);
      expect(a.department.trim().length).toBeGreaterThan(0);
    }
  });

  it("surfaces Web Solutions and Einstein Research Lab heads in PULSE_TEAM", () => {
    const pulseNames = PULSE_TEAM.map((a: Agent) => a.name);
    expect(pulseNames).toContain("Leonardo");
    expect(pulseNames).toContain("Einstein");
  });

  it("contains the expected departments (incl. the two new ones)", () => {
    const depts = new Set(TEAM.map((a: Agent) => a.department));
    expect(depts.has("Web Solutions")).toBe(true);
    expect(depts.has("Einstein Research Lab")).toBe(true);
    // Existing departments must remain intact
    expect(depts.has("Orchestrators")).toBe(true);
    expect(depts.has("Justitia Legal Council")).toBe(true);
    expect(depts.has("Enterprise")).toBe(true);
  });
});
