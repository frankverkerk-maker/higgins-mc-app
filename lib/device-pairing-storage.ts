import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export type StoredDeviceSession = {
  deviceId: string;
  refreshToken: string;
  refreshExpiresAt: number;
  scopes: string[];
};

const SECURE_STORE_KEY = "higgins_device_refresh_v1";
const WEB_SESSION_KEY = "higgins_device_refresh_session_v1";

function isStoredDeviceSession(value: unknown): value is StoredDeviceSession {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<StoredDeviceSession>;
  return typeof candidate.deviceId === "string"
    && typeof candidate.refreshToken === "string"
    && candidate.refreshToken.length >= 20
    && typeof candidate.refreshExpiresAt === "number"
    && Number.isFinite(candidate.refreshExpiresAt)
    && Array.isArray(candidate.scopes)
    && candidate.scopes.every((scope) => typeof scope === "string");
}

async function webRead(): Promise<StoredDeviceSession | null> {
  if (typeof sessionStorage === "undefined") return null;
  const raw = sessionStorage.getItem(WEB_SESSION_KEY);
  if (!raw) return null;
  const parsed: unknown = JSON.parse(raw);
  return isStoredDeviceSession(parsed) ? parsed : null;
}

async function webWrite(value: StoredDeviceSession): Promise<void> {
  if (typeof sessionStorage === "undefined") throw new Error("WEB_SESSION_STORAGE_UNAVAILABLE");
  sessionStorage.setItem(WEB_SESSION_KEY, JSON.stringify(value));
}

async function webDelete(): Promise<void> {
  if (typeof sessionStorage !== "undefined") sessionStorage.removeItem(WEB_SESSION_KEY);
}

export async function readStoredDeviceSession(): Promise<StoredDeviceSession | null> {
  try {
    if (Platform.OS === "web") return await webRead();
    const value = await SecureStore.getItemAsync(SECURE_STORE_KEY);
    return value ? JSON.parse(value) as StoredDeviceSession : null;
  } catch {
    return null;
  }
}

export async function writeStoredDeviceSession(value: StoredDeviceSession): Promise<void> {
  if (Platform.OS === "web") {
    await webWrite(value);
    return;
  }
  await SecureStore.setItemAsync(SECURE_STORE_KEY, JSON.stringify(value), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function clearStoredDeviceSession(): Promise<void> {
  if (Platform.OS === "web") {
    try { await webDelete(); } catch { /* already absent or unavailable */ }
    return;
  }
  await SecureStore.deleteItemAsync(SECURE_STORE_KEY);
}
