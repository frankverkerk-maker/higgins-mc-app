import { describe, it, expect } from "vitest";
import { getTeam } from "../constants/team";
import { mapPayload } from "../lib/team-feed-map";
import { countActiveAgents, getCanonicalAgentDisplayName } from "../lib/team-pulse";
import { selectTeamFeedUrl } from "../lib/team-feed-config";
import {
  fetchValidatedJson,
  isTeamFeedPayload,
  TeamFeedRequestError,
} from "../lib/team-feed-request";

// A representative payload shaped exactly like GET /api/app/team-feed returns.
const SAMPLE_FEED = {
  edition: "internal" as const,
  count: 3,
  agents: [
    { name: "Higgins", role: "Chief Operating Officer", department: "Executive Office", departmentId: "executive", isClassified: 0, isActive: 1, status: "standby", currentTask: null },
    { name: "Morgan", role: "Head of Trading", department: "Morgan Trading Desk", departmentId: "mtd", isClassified: 1, isActive: 1, status: "busy", currentTask: null },
    { name: "BrandNewAgent", role: "Special Ops", department: "Executive Office", departmentId: "executive", isClassified: 0, isActive: 1, status: "active", currentTask: null },
  ],
};

describe("Higgins MC — team feed mapping", () => {
  it("overlays live data without replacing the canonical 88-agent roster", () => {
    const mapped = mapPayload(SAMPLE_FEED);
    expect(mapped.team).toHaveLength(88);
    expect(mapped.team.find((agent) => agent.name === "Higgins")).toMatchObject({
      name: "Higgins",
      role: "Chief Operating Officer",
      department: "Executive Office",
      departmentId: "executive",
    });
    expect(mapped.team.some((agent) => agent.name === "BrandNewAgent")).toBe(false);
  });

  it("filters duplicate service placeholders instead of admitting them as agents", () => {
    const mapped = mapPayload({
      edition: "internal",
      count: 2,
      agents: [
        { name: "Content Pipeline", role: "7-agent productieteam", department: "Einstein Lab", departmentId: "einstein-lab" },
        { name: "Content Pipeline", role: "7-agent productieteam", department: "Finance", departmentId: "finance" },
      ],
    });
    expect(mapped.team).toHaveLength(88);
    expect(mapped.team.filter((agent) => agent.name === "Content Pipeline")).toHaveLength(0);
    expect(mapped.team.filter((agent) => agent.department === "Einstein Lab")).toHaveLength(3);
    expect(mapped.team.filter((agent) => agent.department === "Finance")).toHaveLength(5);
  });

  it("joins approved aliases while retaining stable raw routing keys", () => {
    const mapped = mapPayload({
      edition: "internal",
      count: 2,
      agents: [
        { name: "Nathalie", displayName: "Nathalie Vasquez", role: "Lex Researcher", department: "Justitia Legal Council", departmentId: "jlc" },
        { name: "Warren", displayName: "Warren", role: "CFO", department: "Finance", departmentId: "finance" },
      ],
    });
    expect(mapped.team.find((agent) => agent.name === "Elena Vasquez")).toMatchObject({
      displayName: "Nathalie Vasquez",
      role: "Lex Researcher",
    });
    expect(mapped.team.find((agent) => agent.name === "Warren")).toMatchObject({
      displayName: "Morgan",
      role: "CFO",
      departmentId: "finance",
    });
  });

  it("keeps Finance Warren and MTD Morgan as separate stable raw identities", () => {
    const mapped = mapPayload({
      edition: "internal",
      count: 2,
      agents: [
        { name: "Warren", displayName: "Warren", role: "CFO", department: "Finance", departmentId: "finance" },
        { name: "Morgan", displayName: "Morgan", role: "Desk Lead", department: "Morgan Trading Desk", departmentId: "mtd" },
      ],
    });
    expect(mapped.team.find((agent) => agent.name === "Warren")).toMatchObject({
      displayName: "Morgan",
      role: "CFO",
      department: "Finance",
      departmentId: "finance",
    });
    expect(mapped.team.find((agent) => agent.name === "Morgan")).toMatchObject({
      displayName: "Morgan",
      role: "Desk Lead",
      department: "Morgan Trading Desk",
      departmentId: "mtd",
    });
  });

  it("uses the audited MC feed immediately on web even when stale settings exist", () => {
    expect(selectTeamFeedUrl("web", "https://mc.example/api/app/team-feed", "https://stale.example/feed"))
      .toBe("https://mc.example/api/app/team-feed");
  });

  it("preserves a native operator override and falls back to the build URL", () => {
    expect(selectTeamFeedUrl("ios", "https://mc.example/feed", "https://operator.example/feed"))
      .toBe("https://operator.example/feed");
    expect(selectTeamFeedUrl("ios", "https://mc.example/feed", null))
      .toBe("https://mc.example/feed");
  });

  it("a whitelab feed payload would contain no classified agents", () => {
    const mapped = mapPayload({ ...SAMPLE_FEED, edition: "whitelab" });
    expect(mapped.team).toHaveLength(56);
    expect(mapped.team.some((agent) => agent.isClassified)).toBe(false);
  });

  it("separates the live activity count from the total roster size", () => {
    const activity = {
      Higgins: { status: "standby" },
      Elena: { status: "active" },
      Gary: { status: "busy" },
      Morgan: { status: "idle" },
    };
    expect(countActiveAgents(activity)).toBe(2);
    expect(getTeam("internal").length).toBe(88);
  });

  it("renders legacy Warren keys as canonical Morgan without changing stored routing keys", () => {
    expect(getCanonicalAgentDisplayName("Warren")).toBe("Morgan");
    expect(getCanonicalAgentDisplayName("Morgan")).toBe("Morgan");
    expect(getCanonicalAgentDisplayName("Warren Buffett")).toBe("Warren Buffett");
  });

  it("renders verified JLC, FMC, and UTA full identities while preserving raw keys", () => {
    expect(getCanonicalAgentDisplayName("Adrian")).toBe("Adrian Blackstone");
    expect(getCanonicalAgentDisplayName("Isabelle")).toBe("Isabelle Laurent");
    expect(getCanonicalAgentDisplayName("Matteo")).toBe("Matteo Bellini");
    expect(getCanonicalAgentDisplayName("Nadia")).toBe("Nadia Okonkwo");
    expect(getCanonicalAgentDisplayName("David")).toBe("David Sinclair");
    expect(getCanonicalAgentDisplayName("Sophia")).toBe("Sophia Adler");
    expect(getCanonicalAgentDisplayName("Victoria")).toBe("Victoria Sterling");
    expect(getCanonicalAgentDisplayName("Elena Vasquez")).toBe("Nathalie Vasquez");
    expect(getCanonicalAgentDisplayName("Alexander", "Alexander Whitfield")).toBe("Alexander Whitfield");
  });

  it("does not invent surnames for meaningful canonical mononyms", () => {
    for (const name of ["Justitia", "Avicenna"]) {
      expect(getCanonicalAgentDisplayName(name)).toBe(name);
    }
  });
});

describe("Higgins MC — Home Screen-safe feed transport", () => {
  it("uses only simple CORS-safe request headers and avoids a cache-control preflight", async () => {
    let capturedInit: RequestInit | undefined;
    const fetchImpl = async (_url: string | URL | Request, init?: RequestInit) => {
      capturedInit = init;
      return new Response(JSON.stringify(SAMPLE_FEED), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };
    await fetchValidatedJson({
      url: "https://mc.example/api/app/team-feed",
      validate: isTeamFeedPayload,
      fetchImpl: fetchImpl as typeof fetch,
      timeoutMs: 100,
    });
    const headers = new Headers(capturedInit?.headers);
    expect(headers.get("Accept")).toBe("application/json");
    expect(headers.has("Cache-Control")).toBe(false);
    expect(capturedInit?.cache).toBe("no-store");
  });

  it("accepts the validated live MC payload in standalone web mode", async () => {
    const fetchImpl = async () =>
      new Response(JSON.stringify(SAMPLE_FEED), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    const payload = await fetchValidatedJson({
      url: "https://mc.example/api/app/team-feed",
      validate: isTeamFeedPayload,
      fetchImpl: fetchImpl as typeof fetch,
      timeoutMs: 100,
    });
    expect(payload.count).toBe(3);
  });

  it("retries a transient cold-start network failure and then goes live", async () => {
    let calls = 0;
    const fetchImpl = async () => {
      calls += 1;
      if (calls === 1) throw new TypeError("WebKit cold-start network unavailable");
      return new Response(JSON.stringify(SAMPLE_FEED), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };
    const payload = await fetchValidatedJson({
      url: "https://mc.example/api/app/team-feed",
      validate: isTeamFeedPayload,
      fetchImpl: fetchImpl as typeof fetch,
      retryDelayMs: 1,
      timeoutMs: 100,
    });
    expect(calls).toBe(2);
    expect(payload.agents).toHaveLength(3);
  });

  it("fails truthfully on an invalid payload instead of labelling fallback data live", async () => {
    const fetchImpl = async () =>
      new Response(JSON.stringify({ count: 88, agents: "invalid" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    await expect(
      fetchValidatedJson({
        url: "https://mc.example/api/app/team-feed",
        validate: isTeamFeedPayload,
        fetchImpl: fetchImpl as typeof fetch,
        attempts: 1,
        timeoutMs: 100,
      }),
    ).rejects.toMatchObject({ code: "invalid_payload" });
  });

  it("aborts a hung Home Screen request at the deadline", async () => {
    const fetchImpl = (_url: string | URL | Request, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
      });
    await expect(
      fetchValidatedJson({
        url: "https://mc.example/api/app/team-feed",
        validate: isTeamFeedPayload,
        fetchImpl: fetchImpl as typeof fetch,
        attempts: 1,
        timeoutMs: 5,
      }),
    ).rejects.toMatchObject({ code: "timeout" });
  });
});
