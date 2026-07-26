import { describe, it, expect } from "vitest";
import {
  TEAM,
  PULSE_TEAM,
  DEPARTMENTS,
  getTeam,
  getDepartments,
  type Agent,
} from "../constants/team";

// These tests lock in the full HCC team structure (v2.1.0, July 2026).
// 11 departments · 88 agents · 3 classified (MTD, UTA, Task Force Ghost).

const CLASSIFIED_DEPTS = [
  "Morgan Trading Desk",
  "Ultra Trust Agency",
  "Task Force Ghost",
];

describe("Higgins MC — HCC team structure (v2.1)", () => {
  it("defines 11 departments", () => {
    expect(DEPARTMENTS.length).toBe(11);
  });

  it("defines 88 agents", () => {
    expect(TEAM.length).toBe(88);
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
      "Executive Office": 6,
      "Einstein Lab": 3,
      "Finance": 5,
      "Technology Division": 6,
      "Marketing & Creative": 7,
      "Enterprise Operations": 14,
      "Functional Medicine Center": 9,
      "Justitia Legal Council": 6,
      "Morgan Trading Desk": 7,
      "Ultra Trust Agency": 23,
      "Task Force Ghost": 2,
    };
    for (const [dept, expected] of Object.entries(counts)) {
      const actual = TEAM.filter((a) => a.department === dept).length;
      expect(actual, dept).toBe(expected);
    }
  });

  it("includes the key leadership agents", () => {
    const names = new Set(TEAM.map((a) => a.name));
    for (const n of ["Higgins", "Nathalie", "Elon", "Gary", "Justitia", "Warren", "Victoria", "Morgan", "Einstein", "David", "Zero"]) {
      expect(names.has(n)).toBe(true);
    }
  });

  it("includes the FMC scientific directors", () => {
    const fmc = TEAM.filter((a) => a.department === "Functional Medicine Center").map((a) => a.name);
    for (const n of ["David", "Vladimir", "Samuel", "Rosalind", "Maria", "Akiko", "Avicenna", "Siddhartha", "Sophia"]) {
      expect(fmc).toContain(n);
    }
  });

  it("Ultra Trust Agency holds 23 agents led by Victoria", () => {
    const uta = TEAM.filter((a) => a.department === "Ultra Trust Agency");
    expect(uta.length).toBe(23);
    expect(uta.some((a) => a.name === "Victoria")).toBe(true);
    const utaDept = DEPARTMENTS.find((d) => d.name === "Ultra Trust Agency");
    expect(utaDept?.shortName).toBe("UTA");
  });

  it("Morgan Trading Desk holds 7 agents led by Morgan", () => {
    const mtd = TEAM.filter((a) => a.department === "Morgan Trading Desk");
    expect(mtd.length).toBe(7);
    expect(mtd.some((a) => a.name === "Morgan")).toBe(true);
    const mtdDept = DEPARTMENTS.find((d) => d.name === "Morgan Trading Desk");
    expect(mtdDept?.shortName).toBe("MTD");
  });

  it("Task Force Ghost holds 2 agents led by Zero", () => {
    const tfg = TEAM.filter((a) => a.department === "Task Force Ghost");
    expect(tfg.length).toBe(2);
    expect(tfg.some((a) => a.name === "Zero")).toBe(true);
    expect(tfg.some((a) => a.name === "Spectre")).toBe(true);
  });

  it("marks MTD, UTA and Task Force Ghost departments as classified", () => {
    for (const name of CLASSIFIED_DEPTS) {
      const d = DEPARTMENTS.find((x) => x.name === name);
      expect(d?.classified).toBe(true);
    }
  });

  it("every agent in a classified department carries isClassified", () => {
    const classified = TEAM.filter((a) => CLASSIFIED_DEPTS.includes(a.department));
    expect(classified.length).toBe(32); // 7 MTD + 23 UTA + 2 TFG
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
    // Whitelab drops 32 classified agents and 3 classified departments
    expect(wlTeam.length).toBe(88 - 32);
    expect(wlDepts.length).toBe(11 - 3);
    // Internal edition keeps everything
    expect(getTeam("internal").length).toBe(TEAM.length);
    expect(getDepartments("internal").length).toBe(DEPARTMENTS.length);
  });

  it("PULSE_TEAM surfaces the core leadership", () => {
    const pulseNames = PULSE_TEAM.map((a: Agent) => a.name);
    for (const n of ["Higgins", "Nathalie", "Gary", "Elon"]) {
      expect(pulseNames).toContain(n);
    }
  });
});
