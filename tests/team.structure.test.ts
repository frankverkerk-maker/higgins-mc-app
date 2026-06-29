import { describe, it, expect } from "vitest";
import {
  TEAM,
  PULSE_TEAM,
  DEPARTMENTS,
  getTeam,
  getDepartments,
  type Agent,
} from "../constants/team";

// These tests lock in the full HCC team structure (master document v1.0.0).
// They guard against accidental removal of departments/agents and verify the
// classified flags + whitelab edition filtering behave correctly.

const CLASSIFIED_DEPTS = [
  "United Trust Agency",
  "Warren Trading Desk",
  "Task Force Ghost",
];

describe("Higgins MC — HCC team structure", () => {
  it("defines 12 departments", () => {
    expect(DEPARTMENTS.length).toBe(12);
  });

  it("has unique agent names (no duplicates)", () => {
    const names = TEAM.map((a: Agent) => a.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("every agent has a non-empty name, role and department", () => {
    for (const a of TEAM) {
      expect(a.name.trim().length).toBeGreaterThan(0);
      expect(a.role.trim().length).toBeGreaterThan(0);
      expect(a.department.trim().length).toBeGreaterThan(0);
    }
  });

  it("every agent department maps to a known department", () => {
    const deptNames = new Set(DEPARTMENTS.map((d) => d.name));
    for (const a of TEAM) {
      expect(deptNames.has(a.department)).toBe(true);
    }
  });

  it("includes the key leadership agents", () => {
    const names = new Set(TEAM.map((a) => a.name));
    for (const n of ["Higgins", "Elena", "Elon", "Gary", "Vita", "Catharina", "Warren", "Victoria"]) {
      expect(names.has(n)).toBe(true);
    }
  });

  it("includes the FMC scientific board", () => {
    const fmc = TEAM.filter((a) => a.department === "Functional Medicine Center").map((a) => a.name);
    for (const n of [
      "Prof. David Sinclair",
      "Prof. Vladimir Khavinson",
      "Prof. Rosalind Franklin",
      "Prof. Samuel Hahnemann",
      "Prof. Maria Blasco",
    ]) {
      expect(fmc).toContain(n);
    }
  });

  it("marks UTA, WTD and Task Force Ghost departments as classified", () => {
    for (const name of CLASSIFIED_DEPTS) {
      const d = DEPARTMENTS.find((x) => x.name === name);
      expect(d?.classified).toBe(true);
    }
  });

  it("Task Force Ghost exposes no named agents (operational security)", () => {
    const ghost = TEAM.filter((a) => a.department === "Task Force Ghost");
    expect(ghost.length).toBe(0);
  });

  it("every agent in a classified department carries isClassified", () => {
    const classified = TEAM.filter((a) => CLASSIFIED_DEPTS.includes(a.department));
    expect(classified.length).toBeGreaterThan(0);
    for (const a of classified) expect(a.isClassified).toBe(true);
    // Non-classified agents must NOT carry the flag
    for (const a of TEAM.filter((a) => !CLASSIFIED_DEPTS.includes(a.department))) {
      expect(a.isClassified).toBeFalsy();
    }
  });

  it("whitelab edition hides classified departments and agents", () => {
    const wlTeam = getTeam("whitelab");
    const wlDepts = getDepartments("whitelab");
    expect(wlTeam.some((a) => a.isClassified)).toBe(false);
    expect(wlDepts.some((d) => d.classified)).toBe(false);
    // Internal edition keeps everything
    expect(getTeam("internal").length).toBe(TEAM.length);
    expect(getDepartments("internal").length).toBe(DEPARTMENTS.length);
  });

  it("PULSE_TEAM surfaces the core leadership", () => {
    const pulseNames = PULSE_TEAM.map((a: Agent) => a.name);
    for (const n of ["Higgins", "Elena", "Gary", "Elon"]) {
      expect(pulseNames).toContain(n);
    }
  });
});
