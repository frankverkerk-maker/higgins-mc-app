/**
 * usePushNotifications — Higgins MC
 *
 * Regelt:
 * 1. Permissie aanvragen bij de gebruiker
 * 2. Expo Push Token ophalen en opslaan in AsyncStorage
 * 3. Token registreren op de server (zodat Higgins kan pushen)
 * 4. Notificatie-listeners instellen (foreground + tap)
 * 5. Deep link navigatie bij tap op notificatie
 *
 * Gebruik: aanroepen in app/_layout.tsx (root level)
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { Platform, AppState, type AppStateStatus } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useLanguage } from "@/lib/language-provider";
import { getApiBaseUrl } from "@/constants/oauth";

const PUSH_TOKEN_KEY = "higgins_push_token";

// Stel de foreground handler in (globaal, buiten component)
if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export function usePushNotifications() {
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<string>("unknown");
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);
  const router = useRouter();
  const { language } = useLanguage();

  useEffect(() => {
    if (Platform.OS === "web") return;

    // Android notification channel
    if (Platform.OS === "android") {
      Notifications.setNotificationChannelAsync("higgins-default", {
        name: "Higgins Notificaties",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 150, 100, 150],
        lightColor: "#00D4D4",
        sound: "default",
      });
      Notifications.setNotificationChannelAsync("higgins-approvals", {
        name: "Goedkeuringen",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 150, 250],
        lightColor: "#00D4D4",
      });
    }

    // Token registratie met retry
    registerForPushNotifications().then(async (token) => {
      if (!token) return;
      setPushToken(token);
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
      await registerTokenOnServer(token, language);
    });

    // Reconcile: als de app terugkomt uit de achtergrond, controleer of het token
    // nog geregistreerd is (netwerk was misschien weg bij eerste poging)
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === "active") {
        AsyncStorage.getItem(PUSH_TOKEN_KEY).then((storedToken) => {
          if (storedToken) {
            registerTokenOnServer(storedToken, language);
          }
        });
      }
    };
    const appStateSub = AppState.addEventListener("change", handleAppState);

    // Luister naar notificaties terwijl app open is
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        // Notificatie ontvangen terwijl app open is — geen extra actie nodig
        // (setNotificationHandler zorgt al voor weergave)
        console.log("[push] Notificatie ontvangen:", notification.request.content.title);
      }
    );

    // Luister naar taps op notificaties
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as Record<string, any>;
        handleNotificationTap(data);
      }
    );

    // Verwerk notificatie waarmee app werd geopend (cold start)
    const lastResponse = Notifications.getLastNotificationResponse();
    if (lastResponse) {
      const data = lastResponse.notification.request.content.data as Record<string, any>;
      // Kleine delay zodat navigatie klaar is
      setTimeout(() => handleNotificationTap(data), 500);
    }

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
      appStateSub.remove();
    };
  }, []);

  function handleNotificationTap(data: Record<string, any>) {
    if (!data) return;
    // Deep link op basis van notificatie type
    switch (data.type) {
      case "approval":
        router.push("/(tabs)" as any);       // Command Center — goedkeuringen
        break;
      case "chat":
        router.push("/(tabs)/chat" as any);   // Chat scherm
        break;
      case "morning_brief":
        router.push("/(tabs)" as any);       // Command Center — morning brief
        break;
      case "agent_update":
        router.push("/(tabs)/agents" as any); // Team Pulse
        break;
      default:
        router.push("/(tabs)" as any);
    }
  }

  return { pushToken, permissionStatus };
}

// ─── Helper: token registreren op server met retry (3 pogingen) ────────────────
const TOKEN_REGISTERED_KEY = "higgins_push_token_registered";

async function registerTokenOnServer(token: string, language: string) {
  // Skip if already registered this session (avoid redundant calls)
  const alreadyRegistered = await AsyncStorage.getItem(TOKEN_REGISTERED_KEY);
  if (alreadyRegistered === token) return;

  const MAX_RETRIES = 3;
  const baseUrl = getApiBaseUrl();

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const resp = await fetch(`${baseUrl}/api/trpc/higgins.registerPushToken`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ json: { token, platform: Platform.OS, language } }),
      });
      if (resp.ok) {
        await AsyncStorage.setItem(TOKEN_REGISTERED_KEY, token);
        console.log("[push] Token succesvol geregistreerd op server");
        return;
      }
      throw new Error(`HTTP ${resp.status}`);
    } catch (err) {
      console.warn(`[push] Registratie poging ${attempt}/${MAX_RETRIES} mislukt:`, err);
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
      }
    }
  }
  console.warn("[push] Token registratie mislukt na 3 pogingen — wordt opnieuw geprobeerd bij app-resume");
}

// ─── Helper: token ophalen ────────────────────────────────────────────────────
async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log("[push] Simulator gedetecteerd — push tokens werken alleen op fysiek apparaat");
    return null;
  }

  // Permissie controleren / aanvragen
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("[push] Permissie geweigerd");
    return null;
  }

  // Expo Push Token ophalen
  try {
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId;

    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );

    console.log("[push] Token verkregen:", tokenData.data.substring(0, 30) + "...");
    return tokenData.data;
  } catch (err) {
    console.error("[push] Token ophalen mislukt:", err);
    return null;
  }
}
