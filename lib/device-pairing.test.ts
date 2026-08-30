import { beforeEach, describe, expect, it, vi } from "vitest";

const browserMocks = vi.hoisted(() => ({
  browserSupportsWebAuthn: vi.fn(() => true),
  startRegistration: vi.fn(async () => ({ id: "credential", rawId: "credential", response: {}, type: "public-key", clientExtensionResults: {} })),
  startAuthentication: vi.fn(async () => ({ id: "credential", rawId: "credential", response: {}, type: "public-key", clientExtensionResults: {} })),
}));

const storageMocks = vi.hoisted(() => ({
  readStoredDeviceSession: vi.fn(),
  writeStoredDeviceSession: vi.fn(),
  clearStoredDeviceSession: vi.fn(),
}));

vi.mock("@simplewebauthn/browser", () => browserMocks);
vi.mock("./device-pairing-storage", () => storageMocks);
vi.mock("@/constants/oauth", () => ({ getApiBaseUrl: () => "https://mc.example" }));

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubGlobal("window", {});
  storageMocks.readStoredDeviceSession.mockResolvedValue(null);
  storageMocks.writeStoredDeviceSession.mockResolvedValue(undefined);
  storageMocks.clearStoredDeviceSession.mockResolvedValue(undefined);
});

describe("Command Center device pairing client", () => {
  it("keeps pairing and claim secrets in JSON bodies and persists only the rotating refresh credential", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ pairingId: "pair-123456", claimToken: "claim-secret", challengeId: "reg-challenge", options: { challenge: "registration" } }))
      .mockResolvedValueOnce(jsonResponse({ deviceId: "device-123456" }))
      .mockResolvedValueOnce(jsonResponse({ challengeId: "auth-challenge", options: { challenge: "authentication" } }))
      .mockResolvedValueOnce(jsonResponse({
        accessToken: "access-secret",
        refreshToken: "refresh-secret",
        accessExpiresAt: Date.now() + 300_000,
        refreshExpiresAt: Date.now() + 86_400_000,
        scopes: ["cc:contact:create"],
        deviceId: "device-123456",
      }));
    vi.stubGlobal("fetch", fetchMock);

    const pairing = await import("./device-pairing");
    const result = await pairing.pairCommandCenterDevice({ pairingId: "pair-123456", claimCode: "ABCDEFGHJKLM" });

    expect(result.deviceId).toBe("device-123456");
    expect(browserMocks.startRegistration).toHaveBeenCalledOnce();
    expect(browserMocks.startAuthentication).toHaveBeenCalledOnce();
    const urls = fetchMock.mock.calls.map(([url]) => String(url));
    expect(urls.every((url) => !url.includes("ABCDEFGHJKLM") && !url.includes("claim-secret"))).toBe(true);
    expect(storageMocks.writeStoredDeviceSession).toHaveBeenCalledWith(expect.objectContaining({
      deviceId: "device-123456",
      refreshToken: "refresh-secret",
    }));
    expect(storageMocks.writeStoredDeviceSession.mock.calls[0][0]).not.toHaveProperty("accessToken");
    expect(pairing.getDeviceAccessToken()).toBe("access-secret");
  });

  it("coalesces concurrent access restoration into one refresh rotation", async () => {
    const now = Date.now();
    storageMocks.readStoredDeviceSession.mockResolvedValue({
      deviceId: "device-123456",
      refreshToken: "refresh-secret",
      refreshExpiresAt: now + 86_400_000,
      scopes: ["cc:contact:create"],
    });
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      accessToken: "access-next",
      refreshToken: "refresh-next",
      accessExpiresAt: now + 300_000,
      refreshExpiresAt: now + 86_400_000,
      scopes: ["cc:contact:create"],
      deviceId: "device-123456",
    }));
    vi.stubGlobal("fetch", fetchMock);

    const pairing = await import("./device-pairing");
    const [first, second] = await Promise.all([
      pairing.getValidDeviceAccessToken(),
      pairing.getValidDeviceAccessToken(),
    ]);

    expect(first).toBe("access-next");
    expect(second).toBe("access-next");
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(storageMocks.writeStoredDeviceSession).toHaveBeenCalledOnce();
  });

  it("clears an expired stored refresh credential without making a network request", async () => {
    storageMocks.readStoredDeviceSession.mockResolvedValue({
      deviceId: "device-123456",
      refreshToken: "expired-refresh",
      refreshExpiresAt: Date.now() - 1,
      scopes: [],
    });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const pairing = await import("./device-pairing");
    await expect(pairing.restoreDeviceSession()).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(storageMocks.clearStoredDeviceSession).toHaveBeenCalledOnce();
  });
});
