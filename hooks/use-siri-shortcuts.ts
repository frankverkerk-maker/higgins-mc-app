/**
 * Higgins MC — useSiriShortcuts Hook
 *
 * Handles incoming Siri Shortcut invocations and routes them:
 * - "open_chat" → Navigate to Chat tab (optionally with prefill)
 * - "morning_briefing" → Navigate to Command tab and trigger briefing
 * - "start_meeting" → Navigate to Chat tab with meeting mode flag
 *
 * Also donates shortcuts after first app use.
 */

import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { useRouter } from "expo-router";
import {
  donateAllShortcuts,
  onShortcutReceived,
  getInitialShortcut,
  isSiriAvailable,
} from "@/lib/siri-shortcuts";

export function useSiriShortcuts() {
  const router = useRouter();
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (Platform.OS !== "ios" || hasInitialized.current) return;
    hasInitialized.current = true;

    // Donate all shortcuts so they appear in the iOS Shortcuts app
    if (isSiriAvailable()) {
      // Small delay to not block app startup
      setTimeout(() => donateAllShortcuts(), 2000);
    }

    // Handle shortcut that launched the app (cold start)
    getInitialShortcut().then((userInfo) => {
      if (userInfo) handleShortcutAction(userInfo);
    });

    // Handle shortcuts while app is running (warm start)
    const cleanup = onShortcutReceived((userInfo) => {
      handleShortcutAction(userInfo);
    });

    return cleanup;
  }, []);

  function handleShortcutAction(userInfo: Record<string, string>) {
    const action = userInfo.action;

    switch (action) {
      case "open_chat":
        // Navigate to Chat tab — user will speak their command
        router.push("/(tabs)/chat" as any);
        break;

      case "morning_briefing":
        // Navigate to Command tab (index) where briefing lives
        router.push("/(tabs)/" as any);
        break;

      case "start_meeting":
        // Navigate to Chat with meeting flag
        router.push({ pathname: "/(tabs)/chat" as any, params: { startMeeting: "true" } });
        break;

      default:
        // Unknown action — just open the app (default behavior)
        break;
    }
  }
}
