import { describe, expect, it, vi } from "vitest";
import { fetchValidatedJson, isTeamFeedPayload, TeamFeedRequestError } from "./team-feed-request";

const validPayload = {
  edition: "internal" as const,
  count: 1,
  agents: [{ name: "Higgins", role: "Chief of Staff", department: "Executive Office" }],
};

describe("bounded MC team-feed request", () => {
  it("reports retry attempts and preserves the CORS-safe request contract", async () => {
    const onAttempt = vi.fn();
    const fetchImpl = vi.fn()
      .mockRejectedValueOnce(new Error("temporary network failure"))
      .mockResolvedValueOnce(new Response(JSON.stringify(validPayload), { status: 200 }));

    await expect(fetchValidatedJson({
      url: "https://mc.example/api/app/team-feed",
      validate: isTeamFeedPayload,
      attempts: 2,
      retryDelayMs: 0,
      fetchImpl: fetchImpl as typeof fetch,
      onAttempt,
    })).resolves.toEqual(validPayload);

    expect(onAttempt.mock.calls).toEqual([[1, 2], [2, 2]]);
    expect(fetchImpl).toHaveBeenLastCalledWith(
      "https://mc.example/api/app/team-feed",
      expect.objectContaining({
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
        credentials: "omit",
        mode: "cors",
      }),
    );
  });

  it("classifies a bounded abort as timeout", async () => {
    const fetchImpl = vi.fn((_url: RequestInfo | URL, options?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      options?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    }));

    await expect(fetchValidatedJson({
      url: "https://mc.example/api/app/team-feed",
      validate: isTeamFeedPayload,
      attempts: 1,
      timeoutMs: 5,
      fetchImpl: fetchImpl as typeof fetch,
    })).rejects.toMatchObject({ code: "timeout" } satisfies Partial<TeamFeedRequestError>);
  });

  it("rejects a successful HTTP response with an invalid roster payload", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ agents: [] }), { status: 200 }));
    await expect(fetchValidatedJson({
      url: "https://mc.example/api/app/team-feed",
      validate: isTeamFeedPayload,
      attempts: 1,
      fetchImpl: fetchImpl as typeof fetch,
    })).rejects.toMatchObject({ code: "invalid_payload" } satisfies Partial<TeamFeedRequestError>);
  });
});
