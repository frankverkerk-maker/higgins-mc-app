import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react-native", () => ({ Platform: { OS: "web" } }));
vi.mock("expo-secure-store", () => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: "WHEN_UNLOCKED_THIS_DEVICE_ONLY",
}));

const records = new Map<string, string>();
const sessionStorageStub = {
  getItem: vi.fn((key: string) => records.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => { records.set(key, value); }),
  removeItem: vi.fn((key: string) => { records.delete(key); }),
  clear: vi.fn(() => records.clear()),
  key: vi.fn(() => null),
  get length() { return records.size; },
};

beforeEach(() => {
  records.clear();
  vi.clearAllMocks();
  vi.stubGlobal("sessionStorage", sessionStorageStub);
});

describe("PWA device refresh storage", () => {
  it("stores and reads the rotating credential only for the active browser session", async () => {
    const storage = await import("./device-pairing-storage");
    const value = {
      deviceId: "device-123456",
      refreshToken: "refresh-token-with-enough-entropy",
      refreshExpiresAt: Date.now() + 60_000,
      scopes: ["cc:contact:create"],
    };
    await storage.writeStoredDeviceSession(value);
    await expect(storage.readStoredDeviceSession()).resolves.toEqual(value);
    expect(sessionStorageStub.setItem).toHaveBeenCalledOnce();
  });

  it("rejects malformed or truncated stored credentials", async () => {
    records.set("higgins_device_refresh_session_v1", JSON.stringify({ deviceId: "device", refreshToken: "short" }));
    const storage = await import("./device-pairing-storage");
    await expect(storage.readStoredDeviceSession()).resolves.toBeNull();
  });

  it("deletes the web credential immediately on revoke or logout", async () => {
    records.set("higgins_device_refresh_session_v1", "present");
    const storage = await import("./device-pairing-storage");
    await storage.clearStoredDeviceSession();
    expect(records.size).toBe(0);
    expect(sessionStorageStub.removeItem).toHaveBeenCalledOnce();
  });
});
