import { describe, it, expect } from "vitest";

/**
 * Validates that EXPO_PUBLIC_API_BASE_URL points to the reachable public
 * Command Center contract. This guards against a dead/volatile host or a
 * regression to Mac Mini tunnel dependence.
 */
describe("EXPO_PUBLIC_API_BASE_URL", () => {
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

  it("is configured", () => {
    expect(baseUrl, "EXPO_PUBLIC_API_BASE_URL must be set").toBeTruthy();
    expect(baseUrl!).toMatch(/^https?:\/\//);
  });

  it("reaches the public Command Center status endpoint without a Mac tunnel", async () => {
    const url = `${baseUrl!.replace(/\/$/, "")}/api/app/status`;
    const res = await fetch(url, { method: "GET" });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { system?: string; tunnelRequired?: boolean };
    expect(body.system).toBe("operational");
    expect(body.tunnelRequired).toBe(false);
  });
});
