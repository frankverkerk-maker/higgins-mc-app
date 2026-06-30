import { useState, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet, Platform, Pressable, Switch, TextInput, ActivityIndicator, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { AppBackground } from "@/components/app-background";
import { useLanguage } from "@/lib/language-provider";
import { type Language, LANGUAGE_NAMES, LANGUAGE_FLAGS } from "@/lib/i18n";
import { MC_TEAM_FEED_URL_KEY } from "@/lib/team-feed";

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:         "#0A0C0E",
  surface:    "#111418",
  surface2:   "#161B21",
  border:     "#1E2530",
  cyan:       "#00D4D4",
  cyanDim:    "rgba(0,212,212,0.12)",
  cyanBorder: "rgba(0,212,212,0.25)",
  text:       "#E8EDF2",
  muted:      "#5A6472",
  green:      "#00D4A0",
  greenDim:   "rgba(0,212,160,0.15)",
  red:        "#F87171",
  redDim:     "rgba(248,113,113,0.12)",
  redBorder:  "rgba(248,113,113,0.25)",
};
const FONT      = Platform.OS === "ios" ? "Avenir" : undefined;
const FONT_BOLD = Platform.OS === "ios" ? "Avenir-Heavy" : undefined;

function haptic(style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) {
  if (Platform.OS !== "web") {
    try { Haptics.impactAsync(style); } catch (_) {}
  }
}

function hapticNotification(type: Haptics.NotificationFeedbackType) {
  if (Platform.OS !== "web") {
    try { Haptics.notificationAsync(type); } catch (_) {}
  }
}

const LOCATION_KEY = "@higgins_weather_location";

export default function SettingsScreen() {
  const { t, language, setLanguage } = useLanguage();
  const [notifications, setNotifications] = useState(true);
  const [briefingEnabled, setBriefingEnabled] = useState(true);
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [locationInput, setLocationInput] = useState("Bottighofen, CH");
  const [locationSaving, setLocationSaving] = useState(false);
  const [locationSaved, setLocationSaved] = useState(false);

  // MC Team-feed URL (operator-instelling)
  const [feedInput, setFeedInput] = useState("");
  const [feedSaving, setFeedSaving] = useState(false);
  const [feedStatus, setFeedStatus] = useState<"unknown" | "connected" | "fallback" | "empty">("empty");

  useEffect(() => {
    AsyncStorage.getItem(LOCATION_KEY).then((val) => {
      if (val) setLocationInput(val);
    });
    AsyncStorage.getItem(MC_TEAM_FEED_URL_KEY).then((val) => {
      if (val) { setFeedInput(val); setFeedStatus("unknown"); }
    });
  }, []);

  const saveFeedUrl = async () => {
    const url = feedInput.trim();
    setFeedSaving(true);
    try {
      await AsyncStorage.setItem(MC_TEAM_FEED_URL_KEY, url);
      if (!url) { setFeedStatus("empty"); setFeedSaving(false); return; }
      // Test de feed direct
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      try {
        const res = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
        const data = await res.json().catch(() => null);
        setFeedStatus(res.ok && data && Array.isArray(data.agents) ? "connected" : "fallback");
      } catch (_) {
        setFeedStatus("fallback");
      } finally {
        clearTimeout(timer);
      }
      haptic(Haptics.ImpactFeedbackStyle.Medium);
    } catch (_) {
      Alert.alert("Fout", "Kon feed-URL niet opslaan.");
    }
    setFeedSaving(false);
  };

  const saveLocation = async () => {
    if (!locationInput.trim()) return;
    setLocationSaving(true);
    try {
      const query = encodeURIComponent(locationInput.trim());
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${query}&count=1&language=${language}&format=json`
      );
      const data = await res.json();
      if (!data.results || data.results.length === 0) {
        Alert.alert("Locatie niet gevonden", `"${locationInput}" kon niet worden gevonden.`);
        setLocationSaving(false);
        return;
      }
      const r = data.results[0];
      const locName = `${r.name}, ${r.country_code?.toUpperCase() ?? r.country ?? ""}`;
      const coords = { lat: r.latitude, lon: r.longitude, name: locName };
      await AsyncStorage.setItem(LOCATION_KEY, locName);
      await AsyncStorage.setItem("@higgins_weather_coords", JSON.stringify(coords));
      setLocationInput(locName);
      setLocationSaved(true);
      setTimeout(() => setLocationSaved(false), 2500);
      haptic(Haptics.ImpactFeedbackStyle.Medium);
    } catch (_) {
      Alert.alert("Fout", "Kon locatie niet opslaan.");
    }
    setLocationSaving(false);
  };

  const handleToggle = (setter: (v: boolean) => void, value: boolean) => {
    haptic(Haptics.ImpactFeedbackStyle.Medium);
    setter(!value);
  };

  const handleLogout = () => {
    hapticNotification(Haptics.NotificationFeedbackType.Warning);
  };

  return (
    <ScreenContainer containerClassName="bg-background">
      <AppBackground>
      <ScrollView
        style={{ flex: 1, backgroundColor: "transparent" }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* ── Header ── */}
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.headerLabel}>{t.settings.preferences.toUpperCase()}</Text>
            <Text style={s.headerTitle}>{t.settings.title}</Text>
          </View>
        </View>

        {/* ── Profiel kaart ── */}
        <Pressable
          style={({ pressed }) => [s.profileCard, pressed && { opacity: 0.85 }]}
          onPress={() => haptic(Haptics.ImpactFeedbackStyle.Light)}
        >
          <View style={s.profileAvatar}>
            <Text style={s.profileAvatarText}>CD</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.profileName}>Carpe Diem GmbH</Text>
            <Text style={s.profileEmail}>admin@carpediem.com</Text>
          </View>
          <View style={s.profileBadge}>
            <Text style={s.profileBadgeText}>Admin</Text>
          </View>
        </Pressable>

        {/* ── Taal ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t.settings.language.toUpperCase()}</Text>
          <View style={s.card}>
            {(["nl", "de", "en"] as Language[]).map((lang, i) => (
              <Pressable
                key={lang}
                style={({ pressed }) => [s.row, i > 0 && s.rowBorder, pressed && { opacity: 0.75 }]}
                onPress={() => { haptic(Haptics.ImpactFeedbackStyle.Medium); setLanguage(lang); }}
              >
                <View style={s.rowLeft}>
                  <Text style={{ fontSize: 22 }}>{LANGUAGE_FLAGS[lang]}</Text>
                  <Text style={[s.rowLabel, language === lang && { color: C.cyan }]}>{LANGUAGE_NAMES[lang]}</Text>
                </View>
                {language === lang && (
                  <View style={[s.connectedBadge, { backgroundColor: C.cyanDim }]}>
                    <View style={[s.statusDot, { backgroundColor: C.cyan }]} />
                    <Text style={[s.statusText, { color: C.cyan }]}>✓</Text>
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        </View>

        {/* ── Locatie (weer) ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>LOCATIE WEER</Text>
          <View style={s.card}>
            <View style={[s.row, { flexDirection: "column", alignItems: "flex-start", gap: 12 }]}>
              <View style={s.rowLeft}>
                <View style={[s.rowIcon, { backgroundColor: "rgba(0,212,212,0.12)" }]}>
                  <Text style={{ fontSize: 14 }}>📍</Text>
                </View>
                <View>
                  <Text style={s.rowLabel}>Stad voor weersvoorspelling</Text>
                  <Text style={s.rowSub}>Typ een stad en sla op</Text>
                </View>
              </View>
              <View style={{ flexDirection: "row", gap: 10, width: "100%" }}>
                <TextInput
                  style={[s.locationInput, { flex: 1 }]}
                  value={locationInput}
                  onChangeText={setLocationInput}
                  placeholder="Bijv. Baden-Baden, DE"
                  placeholderTextColor={C.muted}
                  returnKeyType="done"
                  onSubmitEditing={saveLocation}
                  autoCorrect={false}
                  autoCapitalize="words"
                />
                <Pressable
                  style={({ pressed }) => [
                    s.locationSaveBtn,
                    locationSaved && { backgroundColor: C.green },
                    pressed && { opacity: 0.8 },
                  ]}
                  onPress={saveLocation}
                  disabled={locationSaving}
                >
                  {locationSaving ? (
                    <ActivityIndicator size="small" color={C.bg} />
                  ) : (
                    <Text style={s.locationSaveBtnText}>
                      {locationSaved ? "✓" : "Opslaan"}
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        {/* ── Verbinding ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t.settings.connection.toUpperCase()}</Text>
          <View style={s.card}>
            {/* MC Team-feed URL (operator) */}
            <View style={[s.row, { flexDirection: "column", alignItems: "flex-start", gap: 10 }]}>
              <View style={s.rowLeft}>
                <View style={[s.rowIcon, { backgroundColor: C.cyanDim }]}>
                  <Text style={{ fontSize: 14 }}>🛰️</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.rowLabel}>{t.settings.mcFeedUrl}</Text>
                  <Text style={s.rowSub}>{t.settings.mcFeedUrlDesc}</Text>
                </View>
              </View>
              <View style={{ flexDirection: "row", gap: 10, width: "100%" }}>
                <TextInput
                  style={[s.locationInput, { flex: 1 }]}
                  value={feedInput}
                  onChangeText={setFeedInput}
                  placeholder={t.settings.mcFeedUrlPlaceholder}
                  placeholderTextColor={C.muted}
                  returnKeyType="done"
                  onSubmitEditing={saveFeedUrl}
                  autoCorrect={false}
                  autoCapitalize="none"
                  keyboardType="url"
                />
                <Pressable
                  style={({ pressed }) => [s.locationSaveBtn, pressed && { opacity: 0.8 }]}
                  onPress={saveFeedUrl}
                  disabled={feedSaving}
                >
                  {feedSaving ? (
                    <ActivityIndicator size="small" color={C.bg} />
                  ) : (
                    <Text style={s.locationSaveBtnText}>{t.common.save}</Text>
                  )}
                </Pressable>
              </View>
              <View style={s.connectedBadge}>
                <View style={[s.statusDot, { backgroundColor: feedStatus === "connected" ? C.green : C.muted }]} />
                <Text style={[s.statusText, { color: feedStatus === "connected" ? C.green : C.muted }]}>
                  {feedStatus === "connected"
                    ? t.settings.mcFeedConnected
                    : feedStatus === "fallback"
                      ? t.settings.mcFeedFallback
                      : t.settings.mcFeedEmpty}
                </Text>
              </View>
            </View>

            {/* Mission Control */}
            <Pressable
              style={({ pressed }) => [s.row, s.rowBorder, pressed && { opacity: 0.75 }]}
              onPress={() => haptic(Haptics.ImpactFeedbackStyle.Light)}
            >
              <View style={s.rowLeft}>
                <View style={[s.rowIcon, { backgroundColor: C.cyanDim }]}>
                  <Text style={{ fontSize: 14 }}>☁️</Text>
                </View>
                <View>
                  <Text style={s.rowLabel}>Mission Control</Text>
                  <Text style={s.rowSub}>Manus API · Cloud</Text>
                </View>
              </View>
              <View style={s.connectedBadge}>
                <View style={[s.statusDot, { backgroundColor: C.green }]} />
                <Text style={[s.statusText, { color: C.green }]}>{t.common.online}</Text>
              </View>
            </Pressable>

            {/* Hermes Agent */}
            <Pressable
              style={({ pressed }) => [s.row, s.rowBorder, pressed && { opacity: 0.75 }]}
              onPress={() => haptic(Haptics.ImpactFeedbackStyle.Light)}
            >
              <View style={s.rowLeft}>
                <View style={[s.rowIcon, { backgroundColor: "rgba(167,139,250,0.12)" }]}>
                  <Text style={{ fontSize: 14 }}>🖥️</Text>
                </View>
                <View>
                  <Text style={s.rowLabel}>Hermes Agent</Text>
                  <Text style={s.rowSub}>Mac Mini · Tailscale</Text>
                </View>
              </View>
              <View style={s.connectedBadge}>
                <View style={[s.statusDot, { backgroundColor: C.green }]} />
                <Text style={[s.statusText, { color: C.green }]}>{t.common.online}</Text>
              </View>
            </Pressable>

            {/* Slack */}
            <Pressable
              style={({ pressed }) => [s.row, s.rowBorder, pressed && { opacity: 0.75 }]}
              onPress={() => haptic(Haptics.ImpactFeedbackStyle.Light)}
            >
              <View style={s.rowLeft}>
                <View style={[s.rowIcon, { backgroundColor: "rgba(245,166,35,0.12)" }]}>
                  <Text style={{ fontSize: 14 }}>💬</Text>
                </View>
                <View>
                  <Text style={s.rowLabel}>Slack</Text>
                  <Text style={s.rowSub}>Workspace integratie</Text>
                </View>
              </View>
              <View style={[s.connectedBadge, { backgroundColor: "rgba(90,100,114,0.15)" }]}>
                <View style={[s.statusDot, { backgroundColor: C.muted }]} />
                <Text style={[s.statusText, { color: C.muted }]}>Binnenkort</Text>
              </View>
            </Pressable>
          </View>
        </View>

        {/* ── Voorkeuren ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t.settings.preferences.toUpperCase()}</Text>
          <View style={s.card}>
            {/* Notificaties */}
            <View style={s.row}>
              <View style={s.rowLeft}>
                <View style={[s.rowIcon, { backgroundColor: C.cyanDim }]}>
                  <Text style={{ fontSize: 14 }}>🔔</Text>
                </View>
                <View>
                  <Text style={s.rowLabel}>{t.settings.notifications}</Text>
                  <Text style={s.rowSub}>{t.settings.notificationsDesc}</Text>
                </View>
              </View>
              <Switch
                value={notifications}
                onValueChange={(v) => handleToggle(setNotifications, notifications)}
                trackColor={{ true: C.cyan, false: C.border }}
                thumbColor={notifications ? "#0A0C0E" : "#E8EDF2"}
              />
            </View>

            {/* Ochtend Briefing */}
            <View style={[s.row, s.rowBorder]}>
              <View style={s.rowLeft}>
                <View style={[s.rowIcon, { backgroundColor: "rgba(0,212,160,0.12)" }]}>
                  <Text style={{ fontSize: 14 }}>🌅</Text>
                </View>
                <View>
                  <Text style={s.rowLabel}>{t.settings.morningBriefing}</Text>
                  <Text style={s.rowSub}>{t.settings.morningBriefingDesc}</Text>
                </View>
              </View>
              <Switch
                value={briefingEnabled}
                onValueChange={(v) => handleToggle(setBriefingEnabled, briefingEnabled)}
                trackColor={{ true: C.cyan, false: C.border }}
                thumbColor={briefingEnabled ? "#0A0C0E" : "#E8EDF2"}
              />
            </View>

            {/* Haptische feedback */}
            <View style={[s.row, s.rowBorder]}>
              <View style={s.rowLeft}>
                <View style={[s.rowIcon, { backgroundColor: "rgba(167,139,250,0.12)" }]}>
                  <Text style={{ fontSize: 14 }}>📳</Text>
                </View>
                <View>
                  <Text style={s.rowLabel}>{t.settings.hapticFeedback}</Text>
                  <Text style={s.rowSub}>{t.settings.hapticFeedbackDesc}</Text>
                </View>
              </View>
              <Switch
                value={hapticEnabled}
                onValueChange={(v) => handleToggle(setHapticEnabled, hapticEnabled)}
                trackColor={{ true: C.cyan, false: C.border }}
                thumbColor={hapticEnabled ? "#0A0C0E" : "#E8EDF2"}
              />
            </View>
          </View>
        </View>

        {/* ── Over ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t.settings.about.toUpperCase()}</Text>
          <View style={s.card}>
            <View style={s.row}>
              <Text style={s.rowLabel}>{t.settings.appVersion}</Text>
              <Text style={s.rowValue}>1.0.0 (Beta)</Text>
            </View>
            <View style={[s.row, s.rowBorder]}>
              <Text style={s.rowLabel}>Product</Text>
              <Text style={[s.rowValue, { color: C.cyan }]}>Higgins MC</Text>
            </View>
            <View style={[s.row, s.rowBorder]}>
              <Text style={s.rowLabel}>Aangedreven door</Text>
              <Text style={s.rowValue}>Manus AI</Text>
            </View>
            <View style={[s.row, s.rowBorder]}>
              <Text style={s.rowLabel}>MDM</Text>
              <View style={[s.connectedBadge, { backgroundColor: "rgba(245,166,35,0.12)" }]}>
                <View style={[s.statusDot, { backgroundColor: "#F5A623" }]} />
                <Text style={[s.statusText, { color: "#F5A623" }]}>Nog in te stellen</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Uitloggen ── */}
        <View style={[s.section, { marginBottom: 8 }]}>
          <Pressable
            style={({ pressed }) => [s.logoutButton, pressed && { opacity: 0.75, transform: [{ scale: 0.98 }] }]}
            onPress={handleLogout}
          >
            <Text style={s.logoutText}>{t.settings.logout}</Text>
          </Pressable>
        </View>
      </ScrollView>
      </AppBackground>
    </ScreenContainer>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20, flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  headerLabel: { fontSize: 10, color: C.muted, fontFamily: FONT, letterSpacing: 2, textTransform: "uppercase" },
  headerTitle: { fontSize: 28, fontWeight: "800", color: C.text, fontFamily: FONT_BOLD, letterSpacing: -0.5, marginTop: 4 },

  profileCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    marginHorizontal: 16, marginBottom: 24, padding: 16,
    backgroundColor: "rgba(0,212,212,0.06)", borderRadius: 20,
    borderWidth: 1, borderColor: "rgba(0,212,212,0.35)",
    shadowColor: "#00D4D4", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 16,
  },
  profileAvatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: C.cyanDim, borderWidth: 1.5, borderColor: C.cyanBorder,
    alignItems: "center", justifyContent: "center",
  },
  profileAvatarText: { fontSize: 18, fontWeight: "800", color: C.cyan, fontFamily: FONT_BOLD },
  profileName: { fontSize: 15, fontWeight: "800", color: C.text, fontFamily: FONT_BOLD },
  profileEmail: { fontSize: 12, color: C.muted, marginTop: 2, fontFamily: FONT },
  profileBadge: {
    backgroundColor: C.cyanDim, paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 10, borderWidth: 1, borderColor: C.cyanBorder,
  },
  profileBadgeText: { fontSize: 10, color: C.cyan, fontWeight: "700", fontFamily: FONT_BOLD, letterSpacing: 0.5 },

  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle: {
    fontSize: 10, fontWeight: "700", color: C.muted, fontFamily: FONT_BOLD,
    textTransform: "uppercase", letterSpacing: 2, marginBottom: 10, marginLeft: 4,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,212,212,0.18)",
    overflow: "hidden",
    shadowColor: "#00D4D4",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  row: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 14,
  },
  rowBorder: { borderTopWidth: 1, borderTopColor: C.border },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  rowIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rowLabel: { fontSize: 15, color: C.text, fontWeight: "500", fontFamily: FONT },
  rowSub: { fontSize: 11, color: C.muted, marginTop: 2, fontFamily: FONT },
  rowValue: { fontSize: 13, color: C.muted, fontFamily: FONT },

  connectedBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: C.greenDim, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: "700", fontFamily: FONT_BOLD },

  logoutButton: {
    backgroundColor: C.redDim, borderWidth: 1, borderColor: C.redBorder,
    borderRadius: 16, paddingVertical: 14, alignItems: "center",
  },
  logoutText: { fontSize: 15, color: C.red, fontWeight: "700", fontFamily: FONT_BOLD },

  locationInput: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: "rgba(0,212,212,0.25)",
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, color: C.text, fontFamily: FONT,
  },
  locationSaveBtn: {
    backgroundColor: C.cyan, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 10,
    alignItems: "center", justifyContent: "center", minWidth: 80,
  },
  locationSaveBtnText: { fontSize: 13, fontWeight: "700", color: C.bg, fontFamily: FONT_BOLD },
});
