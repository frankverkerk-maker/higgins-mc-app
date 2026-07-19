/**
 * LanguageSwitcher — Higgins MC
 *
 * Compacte taalwisselaar voor in de navigatiebalk.
 * Toont de actieve taal als vlag + code, tikt om te wisselen via een
 * klein dropdown-achtig menu.
 */
import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useLanguage } from "@/lib/language-provider";
import { type Language, LANGUAGE_FLAGS } from "@/lib/i18n";

const FONT = Platform.OS === "ios" ? "Avenir" : undefined;
const FONT_BOLD = Platform.OS === "ios" ? "Avenir-Heavy" : undefined;

const C = {
  bg:         "#0A0C0E",
  surface:    "#161B21",
  border:     "#1E2530",
  cyan:       "#00D4D4",
  cyanDim:    "rgba(0,212,212,0.15)",
  cyanBorder: "rgba(0,212,212,0.3)",
  text:       "#E8EDF2",
  muted:      "#5A6472",
};

const LANGUAGES: { code: Language; flag: string; label: string }[] = [
  { code: "nl", flag: "🇳🇱", label: "NL" },
  { code: "de", flag: "🇩🇪", label: "DE" },
  { code: "en", flag: "🇬🇧", label: "EN" },
];

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);

  const current = LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0];

  const handleSelect = async (lang: Language) => {
    if (Platform.OS !== "web") {
      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (_) {}
    }
    await setLanguage(lang);
    setOpen(false);
  };

  return (
    <View>
      {/* Trigger knop */}
      <Pressable
        style={({ pressed }) => [s.trigger, pressed && { opacity: 0.75 }]}
        onPress={() => {
          if (Platform.OS !== "web") {
            try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (_) {}
          }
          setOpen(true);
        }}
      >
        <Text style={s.triggerFlag}>{current.flag}</Text>
        <Text style={s.triggerCode}>{current.label}</Text>
        <Text style={s.triggerChevron}>▾</Text>
      </Pressable>

      {/* Dropdown modal */}
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setOpen(false)}>
          <View style={s.overlay}>
            <TouchableWithoutFeedback>
              <View style={s.dropdown}>
                {/* Kleine pijl omhoog */}
                <View style={s.dropdownArrow} />
                {LANGUAGES.map((lang, idx) => (
                  <Pressable
                    key={lang.code}
                    style={({ pressed }) => [
                      s.option,
                      lang.code === language && s.optionActive,
                      pressed && { opacity: 0.75 },
                      idx < LANGUAGES.length - 1 && s.optionBorder,
                    ]}
                    onPress={() => handleSelect(lang.code)}
                  >
                    <Text style={s.optionFlag}>{lang.flag}</Text>
                    <Text style={[s.optionLabel, lang.code === language && s.optionLabelActive]}>
                      {lang.label}
                    </Text>
                    {lang.code === language && (
                      <Text style={s.optionCheck}>✓</Text>
                    )}
                  </Pressable>
                ))}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.cyanDim,
    borderWidth: 1,
    borderColor: C.cyanBorder,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  triggerFlag: { fontSize: 14 },
  triggerCode: {
    fontSize: 11,
    fontWeight: "800",
    color: C.cyan,
    fontFamily: FONT_BOLD,
    letterSpacing: 0.5,
  },
  triggerChevron: {
    fontSize: 9,
    color: C.cyan,
    marginTop: 1,
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: Platform.OS === "ios" ? 100 : 80,
    paddingRight: 16,
  },
  dropdownArrow: {
    position: "absolute",
    top: -6,
    right: 14,
    width: 12,
    height: 12,
    backgroundColor: C.surface,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: C.border,
    transform: [{ rotate: "45deg" }],
  },
  dropdown: {
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    minWidth: 110,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 20,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  optionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  optionActive: {
    backgroundColor: C.cyanDim,
  },
  optionFlag: { fontSize: 16 },
  optionLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: C.text,
    fontFamily: FONT,
  },
  optionLabelActive: {
    color: C.cyan,
    fontFamily: FONT_BOLD,
  },
  optionCheck: {
    fontSize: 13,
    color: C.cyan,
    fontWeight: "800",
  },
});
