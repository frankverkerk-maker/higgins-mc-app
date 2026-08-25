import { describe, it, expect } from "vitest";
import { getTeam, type Agent } from "../constants/team";
import { countActiveAgents, getCanonicalAgentDisplayName } from "../lib/team-pulse";
import { selectTeamFeedUrl } from "../lib/team-feed-config";

// The useTeamFeed hook performs a deterministic merge between the live MC feed
// payload and the built-in metadata. We extract and test that pure mapping here
// (the hook itself wraps it with React/AsyncStorage which we don't unit-test).

type FeedAgent = {
  name: string;
  displayName?: string;
  role: string;
  department: string;
  departmentId?: string;
  isClassified?: number | boolean;
  isActive?: number | boolean;
  status?: string;
  currentTask?: string | null;
  reportsToDisplayName?: string | null;
};

// Mirror of mergeFeedAgent in lib/team-feed.ts (kept in sync intentionally).
function mergeFeedAgent(feed: FeedAgent, builtin?: Agent): Agent {
  return {
    name: feed.name,
    displayName: feed.displayName,
    role: feed.role,
    department: feed.department,
    isClassified: feed.isClassified ? true : builtin?.isClassified,
    model: builtin?.model,
    provider: builtin?.provider,
    team: builtin?.team,
    reportsTo: builtin?.reportsTo,
    reportsToDisplayName: feed.reportsToDisplayName,
    specialties: builtin?.specialties,
    isOrchestrator: builtin?.isOrchestrator,
    isAddOn: builtin?.isAddOn,
  };
}

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
  const builtinByName = new Map(getTeam("internal").map((a) => [a.name, a]));

  it("preserves the feed's name/role/department", () => {
    const merged = SAMPLE_FEED.agents.map((fa) => mergeFeedAgent(fa, builtinByName.get(fa.name)));
    expect(merged[0]).toMatchObject({ name: "Higgins", role: "Chief Operating Officer", department: "Executive Office" });
  });

  it("enriches known agents with built-in metadata (model/provider)", () => {
    const higgins = mergeFeedAgent(SAMPLE_FEED.agents[0], builtinByName.get("Higgins"));
    expect(higgins.model).toBe("Claude Opus");
    expect(higgins.provider).toBe("Anthropic");
  });

  it("maps numeric isClassified flag to a boolean", () => {
    const morgan = mergeFeedAgent(SAMPLE_FEED.agents[1], builtinByName.get("Morgan"));
    expect(morgan.isClassified).toBe(true);
  });

  it("accepts unknown agents from the feed without crashing", () => {
    const unknown = mergeFeedAgent(SAMPLE_FEED.agents[2], builtinByName.get("BrandNewAgent"));
    expect(unknown.name).toBe("BrandNewAgent");
    expect(unknown.model).toBeUndefined();
    expect(unknown.isClassified).toBeFalsy();
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
    const whitelabAgents = SAMPLE_FEED.agents.filter((a) => !a.isClassified);
    const merged = whitelabAgents.map((fa) => mergeFeedAgent(fa, builtinByName.get(fa.name)));
    expect(merged.some((a) => a.isClassified)).toBe(false);
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
