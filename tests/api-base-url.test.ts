import { describe, it, expect } from "vitest";

/**
 * Validates that EXPO_PUBLIC_API_BASE_URL points to a reachable, healthy
 * backend. This guards against the app being pointed at a dead/volatile
 * host (which would surface as HTTP 502 in Expo Go).
 */
describe("EXPO_PUBLIC_API_BASE_URL", () => {
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

  it("is configured", () => {
    expect(baseUrl, "EXPO_PUBLIC_API_BASE_URL must be set").toBeTruthy();
    expect(baseUrl!).toMatch(/^https?:\/\//);
  });

  it("reaches the /api/health endpoint with HTTP 200 and ok:true", async () => {
    const url = `${baseUrl!.replace(/\/$/, "")}/api/health`;
    const res = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(15_000),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok?: boolean };
    expect(body.ok).toBe(true);
  }, 20_000);
});
