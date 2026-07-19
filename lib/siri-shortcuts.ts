/**
 * Higgins MC — Siri Shortcuts Integration
 *
 * Provides three Siri Shortcuts:
 * 1. "Zeg tegen Higgins" / "Tell Higgins" — Opens chat with voice/text command
 * 2. "Ochtend Briefing" / "Morning Briefing" — Opens command center briefing
 * 3. "Start Vergadering" / "Start Meeting" — Opens chat with meeting recorder active
 *
 * These shortcuts are "donated" to iOS when the user performs the action in-app.
 * After donation, they appear in the iOS Shortcuts app and can be triggered via Siri.
 *
 * NOTE: This module only works after a native build (EAS Build).
 * In Expo Go, all functions are safe no-ops.
 */

import { Platform } from "react-native";

// Types for react-native-siri-shortcut
interface ShortcutOptions {
  activityType: string;
  title: string;
  suggestedInvocationPhrase: string;
  isEligibleForSearch?: boolean;
  isEligibleForPrediction?: boolean;
  userInfo?: Record<string, string>;
  needsSave?: boolean;
}

// Lazy-load the native module (returns null in Expo Go / web)
let SiriShortcut: any = null;

function getSiriModule() {
  if (SiriShortcut !== null) return SiriShortcut;
  if (Platform.OS !== "ios") return null;

  try {
    // Dynamic require to avoid crash in Expo Go where native module doesn't exist
    SiriShortcut = require("react-native-siri-shortcut");
    return SiriShortcut;
  } catch {
    SiriShortcut = undefined; // Mark as unavailable
    return null;
  }
}

// ─── Shortcut Definitions ────────────────────────────────────────────────────

export const SHORTCUTS = {
  SEND_COMMAND: {
    activityType: "com.higgins.mc.SendCommand",
    title: "Stuur opdracht naar Higgins",
    suggestedInvocationPhrase: "Zeg tegen Higgins",
    isEligibleForSearch: true,
    isEligibleForPrediction: true,
    userInfo: { action: "open_chat" },
    needsSave: true,
  } as ShortcutOptions,

  MORNING_BRIEFING: {
    activityType: "com.higgins.mc.MorningBriefing",
    title: "Ochtend Briefing",
    suggestedInvocationPhrase: "Ochtend briefing",
    isEligibleForSearch: true,
    isEligibleForPrediction: true,
    userInfo: { action: "morning_briefing" },
    needsSave: true,
  } as ShortcutOptions,

  START_MEETING: {
    activityType: "com.higgins.mc.StartMeeting",
    title: "Start vergadering opname",
    suggestedInvocationPhrase: "Start vergadering",
    isEligibleForSearch: true,
    isEligibleForPrediction: true,
    userInfo: { action: "start_meeting" },
    needsSave: true,
  } as ShortcutOptions,
} as const;

// ─── Donate Shortcuts ────────────────────────────────────────────────────────

/**
 * Donate a shortcut to iOS. Call this when the user performs the action in-app.
 * After donation, the shortcut appears in the iOS Shortcuts app.
 */
export function donateShortcut(shortcut: ShortcutOptions): void {
  const mod = getSiriModule();
  if (!mod?.donateShortcut) return;

  try {
    mod.donateShortcut(shortcut);
  } catch {
    // Silently fail — not critical
  }
}

/**
 * Donate all Higgins shortcuts at once. Call on app startup after first use.
 */
export function donateAllShortcuts(): void {
  const mod = getSiriModule();
  if (!mod?.donateShortcut) return;

  Object.values(SHORTCUTS).forEach((shortcut) => {
    try {
      mod.donateShortcut(shortcut);
    } catch {
      // Silently fail
    }
  });
}

// ─── Present Siri "Add to Siri" Button ──────────────────────────────────────

/**
 * Present the native "Add to Siri" dialog for a specific shortcut.
 * The user can then customize their invocation phrase.
 */
export function presentShortcut(shortcut: ShortcutOptions): void {
  const mod = getSiriModule();
  if (!mod?.presentShortcut) return;

  try {
    mod.presentShortcut(shortcut, ({ status }: { status: string }) => {
      // status: "added" | "updated" | "deleted" | "cancelled"
      console.log(`[Siri] Shortcut ${shortcut.activityType}: ${status}`);
    });
  } catch {
    // Silently fail
  }
}

// ─── Listen for Siri Shortcut Invocations ───────────────────────────────────

type ShortcutListener = (userInfo: Record<string, string>) => void;

let listener: any = null;

/**
 * Register a listener for when the app is opened via a Siri Shortcut.
 * Returns a cleanup function.
 */
export function onShortcutReceived(callback: ShortcutListener): () => void {
  const mod = getSiriModule();
  if (!mod?.addListener) {
    // Fallback: no-op cleanup
    return () => {};
  }

  try {
    listener = mod.addListener("SiriShortcutListener", (event: any) => {
      const userInfo = event?.userInfo ?? {};
      callback(userInfo);
    });
  } catch {
    // Silently fail
  }

  return () => {
    if (listener?.remove) {
      listener.remove();
      listener = null;
    }
  };
}

/**
 * Get the initial shortcut that launched the app (cold start via Siri).
 */
export async function getInitialShortcut(): Promise<Record<string, string> | null> {
  const mod = getSiriModule();
  if (!mod?.getInitialShortcut) return null;

  try {
    const result = await mod.getInitialShortcut();
    return result?.userInfo ?? null;
  } catch {
    return null;
  }
}

// ─── Availability Check ─────────────────────────────────────────────────────

/**
 * Check if Siri Shortcuts are available (native build on iOS).
 */
export function isSiriAvailable(): boolean {
  return getSiriModule() != null;
}
