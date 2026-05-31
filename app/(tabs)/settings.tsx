import { useState } from "react";
import { View, Text, ScrollView, StyleSheet, Platform, Pressable, Switch } from "react-native";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { useLanguage } from "@/lib/language-provider";
import { type Language, LANGUAGE_NAMES, LANGUAGE_FLAGS } from "@/lib/i18n";

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

export default function SettingsScreen() {
  const { t, language, setLanguage } = useLanguage();
  const [notifications, setNotifications] = useState(true);
  const [briefingEnabled, setBriefingEnabled] = useState(true);
  const [hapticEnabled, setHapticEnabled] = useState(true);

  const handleToggle = (setter: (v: boolean) => void, value: boolean) => {
    haptic(Haptics.ImpactFeedbackStyle.Medium);
    setter(!value);
  };

  const handleLogout = () => {
    hapticNotification(Haptics.NotificationFeedbackType.Warning);
  };

  return (
    <ScreenContainer containerClassName="bg-background">
      <ScrollView
        style={{ flex: 1, backgroundColor: C.bg }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* ── Header ── */}
        <View style={s.header}>
          <Text style={s.headerLabel}>{t.settings.preferences.toUpperCase()}</Text>
          <Text style={s.headerTitle}>{t.settings.title}</Text>
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

        {/* ── Verbinding ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Verbinding</Text>
          <View style={s.card}>
            {/* Mission Control */}
            <Pressable
              style={({ pressed }) => [s.row, pressed && { opacity: 0.75 }]}
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
    </ScreenContainer>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 },
  headerLabel: { fontSize: 10, color: C.muted, fontFamily: FONT, letterSpacing: 2, textTransform: "uppercase" },
  headerTitle: { fontSize: 28, fontWeight: "800", color: C.text, fontFamily: FONT_BOLD, letterSpacing: -0.5, marginTop: 4 },

  profileCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    marginHorizontal: 16, marginBottom: 24, padding: 16,
    backgroundColor: C.surface, borderRadius: 20,
    borderWidth: 1, borderColor: C.cyanBorder,
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
  card: { backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: "hidden" },
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
});
