/**
 * Siri Shortcuts Settings Section
 *
 * Shows "Add to Siri" buttons for each available shortcut.
 * Only renders on iOS native builds where Siri is available.
 */

import { View, Text, Pressable, Platform, StyleSheet } from "react-native";
import { useLanguage } from "@/lib/language-provider";
import {
  SHORTCUTS,
  presentShortcut,
  isSiriAvailable,
} from "@/lib/siri-shortcuts";

const FONT = Platform.select({ ios: "Menlo", default: "monospace" });

export function SiriShortcutsSettings() {
  const { language } = useLanguage();

  // Only show on iOS when Siri module is available (native build)
  if (Platform.OS !== "ios" || !isSiriAvailable()) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Siri Shortcuts</Text>
        <Text style={styles.unavailableText}>
          {language === "de"
            ? "Siri Shortcuts sind nach der Installation über TestFlight oder den App Store verfügbar."
            : language === "en"
              ? "Siri Shortcuts will be available after installing via TestFlight or the App Store."
              : "Siri Shortcuts zijn beschikbaar na installatie via TestFlight of de App Store."}
        </Text>
      </View>
    );
  }

  const shortcuts = [
    {
      key: "SEND_COMMAND",
      label: language === "de" ? "Sag Higgins..." : language === "en" ? "Tell Higgins..." : "Zeg tegen Higgins...",
      phrase: language === "de" ? "\"Hey Siri, sag Higgins\"" : language === "en" ? "\"Hey Siri, tell Higgins\"" : "\"Hey Siri, zeg tegen Higgins\"",
      shortcut: SHORTCUTS.SEND_COMMAND,
    },
    {
      key: "MORNING_BRIEFING",
      label: language === "de" ? "Morgen-Briefing" : language === "en" ? "Morning Briefing" : "Ochtend Briefing",
      phrase: language === "de" ? "\"Hey Siri, Morgen-Briefing\"" : language === "en" ? "\"Hey Siri, morning briefing\"" : "\"Hey Siri, ochtend briefing\"",
      shortcut: SHORTCUTS.MORNING_BRIEFING,
    },
    {
      key: "START_MEETING",
      label: language === "de" ? "Besprechung starten" : language === "en" ? "Start Meeting" : "Start Vergadering",
      phrase: language === "de" ? "\"Hey Siri, Besprechung starten\"" : language === "en" ? "\"Hey Siri, start meeting\"" : "\"Hey Siri, start vergadering\"",
      shortcut: SHORTCUTS.START_MEETING,
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Siri Shortcuts</Text>
      <Text style={styles.subtitle}>
        {language === "de"
          ? "Fügen Sie Sprachbefehle hinzu, um Higgins freihändig zu steuern."
          : language === "en"
            ? "Add voice commands to control Higgins hands-free."
            : "Voeg spraakopdrachten toe om Higgins handsfree te bedienen."}
      </Text>

      {shortcuts.map((item) => (
        <Pressable
          key={item.key}
          style={({ pressed }) => [styles.shortcutRow, pressed && { opacity: 0.7 }]}
          onPress={() => presentShortcut(item.shortcut)}
        >
          <View style={styles.shortcutInfo}>
            <Text style={styles.shortcutLabel}>{item.label}</Text>
            <Text style={styles.shortcutPhrase}>{item.phrase}</Text>
          </View>
          <View style={styles.addButton}>
            <Text style={styles.addButtonText}>+ Siri</Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 14,
    fontWeight: "800",
    color: "#00D4D4",
    fontFamily: FONT,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: "#9BA1A6",
    fontFamily: FONT,
    marginBottom: 16,
  },
  unavailableText: {
    fontSize: 13,
    color: "#687076",
    fontFamily: FONT,
    fontStyle: "italic",
    marginTop: 4,
  },
  shortcutRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,212,212,0.15)",
    padding: 14,
    marginBottom: 10,
  },
  shortcutInfo: {
    flex: 1,
  },
  shortcutLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ECEDEE",
    fontFamily: FONT,
  },
  shortcutPhrase: {
    fontSize: 12,
    color: "#687076",
    fontFamily: FONT,
    marginTop: 3,
  },
  addButton: {
    backgroundColor: "rgba(0,212,212,0.15)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(0,212,212,0.3)",
  },
  addButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#00D4D4",
    fontFamily: FONT,
  },
});
