import { describe, expect, it, vi } from "vitest";
import { TeamDirectoryService } from "../server/team-directory";

const payload = {
  edition: "internal",
  count: 3,
  directorySource: "drizzle.agent_team",
  directoryVersion: "1",
  agents: [
    { name: "Elena", role: "Office Manager / Receptioniste", department: "Executive Office", department_id: "executive", is_active: 1 },
    { name: "Nathalie", role: "Office Manager / Receptioniste", department: "Executive", department_id: "executive", is_active: 1 },
    { name: "Elena Vasquez", role: "Researcher", department: "Justitia Legal Council", department_id: "jlc", is_active: 1 },
  ],
};
const jsonResponse = (body: unknown) => new Response(JSON.stringify(body), {
  status: 200, headers: { "Content-Type": "application/json" },
});

describe("TeamDirectoryService", () => {
  it("validates and canonicalizes one upstream response for concurrent requests", async () => {
    const fetcher = vi.fn(async () => jsonResponse(payload));
    const service = new TeamDirectoryService(fetcher as typeof fetch, () => 1_800_000_000_000);
    const [a, b] = await Promise.all([service.get(), service.get()]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(a).toEqual(b);
    expect(a).toMatchObject({ source: "live", contractVersion: 2, count: 2, directorySource: "drizzle.agent_team", directoryVersion: "1" });
    expect(a.agents.map(agent => agent.name)).toEqual(["Nathalie", "Elena Vasquez"]);
    expect(a.agents[0].department).toBe("Executive Office");
  });

  it("returns clearly marked stale data within a bound and never beyond it", async () => {
    let now = 1_800_000_000_000;
    const fetcher = vi.fn()
      .mockResolvedValueOnce(jsonResponse(payload))
      .mockRejectedValue(new Error("MC unavailable"));
    const service = new TeamDirectoryService(fetcher as typeof fetch, () => now);
    expect((await service.get()).source).toBe("live");
    now += 31_000;
    expect((await service.get()).source).toBe("stale");
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
    now += 10 * 60_000;
    await expect(service.get()).rejects.toThrow("MC unavailable");
  });

  it("rejects HTML, upstream errors and malformed JSON without claiming them live", async () => {
    const badResponses = [
      new Response("<html>login</html>", { status: 200, headers: { "Content-Type": "text/html" } }),
      new Response("{}", { status: 503, headers: { "Content-Type": "application/json" } }),
      jsonResponse({ edition: "internal", agents: [{ role: "Manager", department: "Executive" }] }),
    ];
    for (const response of badResponses) {
      const service = new TeamDirectoryService(vi.fn(async () => response) as typeof fetch);
      await expect(service.get()).rejects.toThrow();
    }
  });

  it("does not expose classified records when MC is in whitelab edition", async () => {
    const feed = { ...payload, edition: "whitelab", agents: [
      ...payload.agents,
      { name: "Victoria", role: "Head of Trust", department: "Ultra Trust Agency", department_id: "uta", is_classified: 1 },
      { name: "Shadow", role: "Unknown", department: "Hidden R&D", department_id: "hidden-rd", is_classified: 0 },
    ] };
    const service = new TeamDirectoryService(vi.fn(async () => jsonResponse(feed)) as typeof fetch);
    const result = await service.get();
    expect(result.count).toBe(2);
    expect(result.agents.some(agent => agent.name === "Victoria")).toBe(false);
    expect(result.agents.some(agent => agent.name === "Shadow")).toBe(false);
  });

  it("returns a valid empty live roster when MC has no active agents", async () => {
    const service = new TeamDirectoryService(
      vi.fn(async () => jsonResponse({ ...payload, count: 0, agents: [] })) as typeof fetch,
    );
    expect(await service.get()).toMatchObject({ source: "live", count: 0, agents: [] });
  });
});
