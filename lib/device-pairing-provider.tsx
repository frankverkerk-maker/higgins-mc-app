import { AppState, Platform } from "react-native";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  authenticateCommandCenterDevice,
  disconnectPairedDevice,
  getPairedDeviceStatus,
  pairCommandCenterDevice,
  restoreDeviceSession,
  supportsDevicePasskeys,
  type DevicePairingSnapshot,
} from "./device-pairing";

export type DevicePairingStatus = "checking" | "unpaired" | "pairing" | "paired" | "unsupported" | "error";

type DevicePairingContextValue = {
  status: DevicePairingStatus;
  snapshot: DevicePairingSnapshot | null;
  errorCode: string | null;
  pair: (pairingId: string, claimCode: string) => Promise<void>;
  reconnect: () => Promise<void>;
  disconnect: () => Promise<void>;
  refreshStatus: () => Promise<void>;
};

const DevicePairingContext = createContext<DevicePairingContextValue | null>(null);

function errorCode(error: unknown): string {
  return error instanceof Error && error.message ? error.message : "DEVICE_AUTH_FAILED";
}

export function DevicePairingProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<DevicePairingStatus>("checking");
  const [snapshot, setSnapshot] = useState<DevicePairingSnapshot | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    if (Platform.OS === "web" && !supportsDevicePasskeys()) {
      setStatus("unsupported");
      return;
    }
    setStatus((current) => current === "paired" ? "paired" : "checking");
    try {
      const restored = await restoreDeviceSession();
      if (!restored) {
        setSnapshot(null);
        setStatus("unpaired");
        return;
      }
      const current = await getPairedDeviceStatus();
      setSnapshot(current ?? restored);
      setLastError(null);
      setStatus("paired");
    } catch (error) {
      setSnapshot(null);
      setLastError(errorCode(error));
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (next) => {
      if (next === "active") void refreshStatus();
    });
    return () => subscription.remove();
  }, [refreshStatus]);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    const onVisibility = () => {
      if (document.visibilityState === "visible") void refreshStatus();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [refreshStatus]);

  const pair = useCallback(async (pairingId: string, claimCode: string) => {
    setStatus("pairing");
    setLastError(null);
    try {
      const paired = await pairCommandCenterDevice({ pairingId: pairingId.trim(), claimCode: claimCode.trim() });
      setSnapshot(paired);
      setStatus("paired");
    } catch (error) {
      setLastError(errorCode(error));
      setStatus("error");
      throw error;
    }
  }, []);

  const reconnect = useCallback(async () => {
    if (!snapshot?.deviceId) {
      await refreshStatus();
      return;
    }
    setStatus("pairing");
    setLastError(null);
    try {
      const paired = await authenticateCommandCenterDevice(snapshot.deviceId);
      setSnapshot(paired);
      setStatus("paired");
    } catch (error) {
      setLastError(errorCode(error));
      setStatus("error");
      throw error;
    }
  }, [refreshStatus, snapshot?.deviceId]);

  const disconnect = useCallback(async () => {
    setStatus("pairing");
    setLastError(null);
    try {
      await disconnectPairedDevice();
      setSnapshot(null);
      setStatus("unpaired");
    } catch (error) {
      setLastError(errorCode(error));
      setStatus("error");
      throw error;
    }
  }, []);

  const value = useMemo<DevicePairingContextValue>(() => ({
    status,
    snapshot,
    errorCode: lastError,
    pair,
    reconnect,
    disconnect,
    refreshStatus,
  }), [disconnect, lastError, pair, reconnect, refreshStatus, snapshot, status]);

  return <DevicePairingContext.Provider value={value}>{children}</DevicePairingContext.Provider>;
}

export function useDevicePairing(): DevicePairingContextValue {
  const value = useContext(DevicePairingContext);
  if (!value) throw new Error("useDevicePairing must be used within DevicePairingProvider");
  return value;
}
