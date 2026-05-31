import { View, Text, ScrollView, Pressable, StyleSheet, Switch } from "react-native";
import { useState } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

export default function SettingsScreen() {
  const colors = useColors();
  const styles = makeStyles(colors);
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Instellingen</Text>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>CD</Text>
          </View>
          <View>
            <Text style={styles.profileName}>Carpe Diem GmbH</Text>
            <Text style={styles.profileEmail}>admin@carpediem.com</Text>
          </View>
        </View>

        {/* Connection Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Verbinding</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View>
                <Text style={styles.rowLabel}>Mission Control</Text>
                <Text style={styles.rowSub}>Manus API · Cloud</Text>
              </View>
              <View style={styles.connectedBadge}>
                <View style={styles.connectedDot} />
                <Text style={styles.connectedText}>Verbonden</Text>
              </View>
            </View>
            <View style={[styles.row, styles.rowBorder]}>
              <View>
                <Text style={styles.rowLabel}>Hermes Agent</Text>
                <Text style={styles.rowSub}>Mac Mini · Tailscale</Text>
              </View>
              <View style={styles.connectedBadge}>
                <View style={styles.connectedDot} />
                <Text style={styles.connectedText}>Verbonden</Text>
              </View>
            </View>
            <View style={[styles.row, styles.rowBorder]}>
              <View>
                <Text style={styles.rowLabel}>Slack</Text>
                <Text style={styles.rowSub}>Workspace integratie</Text>
              </View>
              <View style={[styles.connectedBadge, { backgroundColor: colors.border }]}>
                <View style={[styles.connectedDot, { backgroundColor: colors.muted }]} />
                <Text style={[styles.connectedText, { color: colors.muted }]}>Binnenkort</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Voorkeuren</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Notificaties</Text>
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ true: colors.primary, false: colors.border }}
                thumbColor="#fff"
              />
            </View>
            <View style={[styles.row, styles.rowBorder]}>
              <Text style={styles.rowLabel}>Donkere modus</Text>
              <Switch
                value={darkMode}
                onValueChange={setDarkMode}
                trackColor={{ true: colors.primary, false: colors.border }}
                thumbColor="#fff"
              />
            </View>
          </View>
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Over</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Versie</Text>
              <Text style={styles.rowValue}>1.0.0 (Beta)</Text>
            </View>
            <View style={[styles.row, styles.rowBorder]}>
              <Text style={styles.rowLabel}>Product</Text>
              <Text style={styles.rowValue}>Higgins MC</Text>
            </View>
            <View style={[styles.row, styles.rowBorder]}>
              <Text style={styles.rowLabel}>Aangedreven door</Text>
              <Text style={styles.rowValue}>Manus AI</Text>
            </View>
          </View>
        </View>

        {/* Logout */}
        <View style={[styles.section, { marginBottom: 32 }]}>
          <Pressable
            style={({ pressed }) => [styles.logoutButton, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.logoutText}>Uitloggen</Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    header: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      fontSize: 26,
      fontWeight: "700",
      color: colors.foreground,
      letterSpacing: -0.5,
    },
    profileCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      margin: 16,
      padding: 16,
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    profileAvatar: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.primary + "22",
      borderWidth: 1.5,
      borderColor: colors.primary + "55",
      alignItems: "center",
      justifyContent: "center",
    },
    profileAvatarText: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.primary,
    },
    profileName: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.foreground,
    },
    profileEmail: {
      fontSize: 12,
      color: colors.muted,
      marginTop: 2,
    },
    section: {
      paddingHorizontal: 16,
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.muted,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 8,
      marginLeft: 4,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    rowBorder: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    rowLabel: {
      fontSize: 15,
      color: colors.foreground,
      fontWeight: "500",
    },
    rowSub: {
      fontSize: 11,
      color: colors.muted,
      marginTop: 2,
    },
    rowValue: {
      fontSize: 14,
      color: colors.muted,
    },
    connectedBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: "#34D39922",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 10,
    },
    connectedDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: "#34D399",
    },
    connectedText: {
      fontSize: 12,
      color: "#34D399",
      fontWeight: "600",
    },
    logoutButton: {
      backgroundColor: "#EF444422",
      borderWidth: 1,
      borderColor: "#EF444444",
      borderRadius: 16,
      paddingVertical: 14,
      alignItems: "center",
    },
    logoutText: {
      fontSize: 15,
      color: "#F87171",
      fontWeight: "600",
    },
  });
}
