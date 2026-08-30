import { browserSupportsWebAuthn, startAuthentication, startRegistration } from "@simplewebauthn/browser";
import { getApiBaseUrl } from "@/constants/oauth";
import {
  clearStoredDeviceSession,
  readStoredDeviceSession,
  writeStoredDeviceSession,
  type StoredDeviceSession,
} from "./device-pairing-storage";

export const DEVICE_SESSION_HEADER = "X-Higgins-Device-Session";

export const COMMAND_CENTER_DEVICE_SCOPES = [
  "cc:contact:create",
  "cc:command:delegate",
  "cc:agent:activate",
  "cc:agent:command",
  "cc:approval:read",
  "cc:approval:process",
  "cc:registry:write",
  "cc:edition:write",
  "cc:voice:clone",
  "cc:document:upload",
  "cc:notifications:write",
] as const;

type DeviceSessionResponse = {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: number;
  refreshExpiresAt: number;
  scopes: string[];
  deviceId: string;
};

export type DevicePairingSnapshot = {
  deviceId: string;
  scopes: string[];
  accessExpiresAt: number;
  refreshExpiresAt: number;
};

let accessToken: string | null = null;
let snapshot: DevicePairingSnapshot | null = null;
let restoreInFlight: Promise<DevicePairingSnapshot | null> | null = null;

function endpoint(path: string): string {
  const base = getApiBaseUrl().replace(/\/$/, "");
  return `${base}${path}`;
}

async function deviceApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(endpoint(path), {
    ...options,
    credentials: "omit",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers ?? {}),
    },
  });
  const payload = await response.json().catch(() => ({})) as { error?: string } & T;
  if (!response.ok) throw new Error(payload.error || "DEVICE_AUTH_FAILED");
  return payload;
}

async function persistSession(response: DeviceSessionResponse): Promise<DevicePairingSnapshot> {
  accessToken = response.accessToken;
  snapshot = {
    deviceId: response.deviceId,
    scopes: response.scopes,
    accessExpiresAt: response.accessExpiresAt,
    refreshExpiresAt: response.refreshExpiresAt,
  };
  const stored: StoredDeviceSession = {
    deviceId: response.deviceId,
    refreshToken: response.refreshToken,
    refreshExpiresAt: response.refreshExpiresAt,
    scopes: response.scopes,
  };
  await writeStoredDeviceSession(stored);
  return snapshot;
}

export function supportsDevicePasskeys(): boolean {
  return typeof window !== "undefined" && browserSupportsWebAuthn();
}

export function getDeviceAccessToken(): string | null {
  if (!snapshot || snapshot.accessExpiresAt <= Date.now()) return null;
  return accessToken;
}

export function getDevicePairingSnapshot(): DevicePairingSnapshot | null {
  return snapshot;
}

export async function pairCommandCenterDevice(input: {
  pairingId: string;
  claimCode: string;
}): Promise<DevicePairingSnapshot> {
  if (!supportsDevicePasskeys()) throw new Error("PASSKEY_NOT_SUPPORTED");
  const registration = await deviceApi<{
    pairingId: string;
    claimToken: string;
    challengeId: string;
    options: Parameters<typeof startRegistration>[0]["optionsJSON"];
  }>("/api/device/pairing/options", {
    method: "POST",
    body: JSON.stringify(input),
  });
  const registrationResponse = await startRegistration({ optionsJSON: registration.options });
  const device = await deviceApi<{ deviceId: string }>("/api/device/pairing/verify", {
    method: "POST",
    body: JSON.stringify({
      pairingId: registration.pairingId,
      challengeId: registration.challengeId,
      claimToken: registration.claimToken,
      response: registrationResponse,
    }),
  });
  return authenticateCommandCenterDevice(device.deviceId);
}

export async function authenticateCommandCenterDevice(deviceId: string): Promise<DevicePairingSnapshot> {
  if (!supportsDevicePasskeys()) throw new Error("PASSKEY_NOT_SUPPORTED");
  const authentication = await deviceApi<{
    challengeId: string;
    options: Parameters<typeof startAuthentication>[0]["optionsJSON"];
  }>("/api/device/session/options", {
    method: "POST",
    body: JSON.stringify({ deviceId, requestedScopes: COMMAND_CENTER_DEVICE_SCOPES }),
  });
  const authenticationResponse = await startAuthentication({ optionsJSON: authentication.options });
  const session = await deviceApi<DeviceSessionResponse>("/api/device/session/verify", {
    method: "POST",
    body: JSON.stringify({ deviceId, challengeId: authentication.challengeId, response: authenticationResponse }),
  });
  return persistSession(session);
}

async function restoreDeviceSessionOnce(): Promise<DevicePairingSnapshot | null> {
  const stored = await readStoredDeviceSession();
  if (!stored) return null;
  if (stored.refreshExpiresAt <= Date.now()) {
    await clearDeviceSession();
    return null;
  }
  try {
    const session = await deviceApi<DeviceSessionResponse>("/api/device/session/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken: stored.refreshToken }),
    });
    return await persistSession(session);
  } catch {
    await clearDeviceSession();
    return null;
  }
}

export async function restoreDeviceSession(): Promise<DevicePairingSnapshot | null> {
  if (!restoreInFlight) {
    restoreInFlight = restoreDeviceSessionOnce().finally(() => {
      restoreInFlight = null;
    });
  }
  return restoreInFlight;
}

export async function getValidDeviceAccessToken(): Promise<string | null> {
  const current = getDeviceAccessToken();
  if (current) return current;
  await restoreDeviceSession();
  return getDeviceAccessToken();
}

export async function getPairedDeviceStatus(): Promise<DevicePairingSnapshot | null> {
  const token = getDeviceAccessToken();
  if (!token) return restoreDeviceSession();
  const status = await deviceApi<{ deviceId: string; scopes: string[]; authenticatedAt: number }>("/api/device/status", {
    headers: { [DEVICE_SESSION_HEADER]: token },
  });
  return snapshot ? { ...snapshot, deviceId: status.deviceId, scopes: status.scopes } : null;
}

export async function disconnectPairedDevice(): Promise<void> {
  const token = getDeviceAccessToken();
  if (token) {
    await deviceApi("/api/device/self-revoke", {
      method: "POST",
      headers: { [DEVICE_SESSION_HEADER]: token },
    }).catch(() => undefined);
  }
  await clearDeviceSession();
}

export async function clearDeviceSession(): Promise<void> {
  accessToken = null;
  snapshot = null;
  await clearStoredDeviceSession();
}
