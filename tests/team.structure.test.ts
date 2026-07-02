import { describe, it, expect } from "vitest";
import {
  TEAM,
  PULSE_TEAM,
  DEPARTMENTS,
  getTeam,
  getDepartments,
  type Agent,
} from "../constants/team";

// These tests lock in the full HCC team structure (v2.0.0, July 2026).
// 10 departments · 66 agents · 2 classified (Warren Trading Desk, Ultra Trust Agency).

const CLASSIFIED_DEPTS = [
  "Warren Trading Desk",
  "Ultra Trust Agency",
];

describe("Higgins MC — HCC team structure (v2.0)", () => {
  it("defines 10 departments", () => {
    expect(DEPARTMENTS.length).toBe(10);
  });

  it("defines 66 agents", () => {
    expect(TEAM.length).toBe(66);
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

  it("has the expected agent count per department", () => {
    const counts: Record<string, number> = {
      "Executive Office": 3,
      "Technology Division": 6,
      "Marketing & Creative": 6,
      "Functional Medicine Center": 5,
      "Justitia Legal Council": 6,
      "Sales & Revenue": 3,
      "Enterprise Operations": 14,
      "Cross-Functional Specialists": 4,
      "Warren Trading Desk": 2,
      "Ultra Trust Agency": 17,
    };
    for (const [dept, expected] of Object.entries(counts)) {
      const actual = TEAM.filter((a) => a.department === dept).length;
      expect(actual, dept).toBe(expected);
    }
  });

  it("includes the key leadership agents", () => {
    const names = new Set(TEAM.map((a) => a.name));
    for (const n of ["Higgins", "Elena", "Elon", "Gary", "Justitia", "Warren", "Victoria", "Sophia"]) {
      expect(names.has(n)).toBe(true);
    }
  });

  it("includes the FMC scientific directors", () => {
    const fmc = TEAM.filter((a) => a.department === "Functional Medicine Center").map((a) => a.name);
    for (const n of ["David", "Vladimir", "Samuel", "Rosalind", "Maria"]) {
      expect(fmc).toContain(n);
    }
  });

  it("Ultra Trust Agency holds 17 agents led by Victoria", () => {
    const uta = TEAM.filter((a) => a.department === "Ultra Trust Agency");
    expect(uta.length).toBe(17);
    expect(uta.some((a) => a.name === "Victoria")).toBe(true);
    const utaDept = DEPARTMENTS.find((d) => d.name === "Ultra Trust Agency");
    expect(utaDept?.shortName).toBe("UTA");
  });

  it("marks WTD and UTA departments as classified", () => {
    for (const name of CLASSIFIED_DEPTS) {
      const d = DEPARTMENTS.find((x) => x.name === name);
      expect(d?.classified).toBe(true);
    }
  });

  it("every agent in a classified department carries isClassified", () => {
    const classified = TEAM.filter((a) => CLASSIFIED_DEPTS.includes(a.department));
    expect(classified.length).toBe(19); // 2 WTD + 17 UTA
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
    // Whitelab drops 19 classified agents and 2 classified departments
    expect(wlTeam.length).toBe(66 - 19);
    expect(wlDepts.length).toBe(10 - 2);
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
