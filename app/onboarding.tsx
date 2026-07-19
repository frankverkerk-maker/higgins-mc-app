import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  runOnJS,
} from "react-native-reanimated";
import { useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import { useLanguage } from "@/lib/language-provider";
import { type Language, LANGUAGE_FLAGS, LANGUAGE_NAMES } from "@/lib/i18n";

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
};
const FONT      = Platform.OS === "ios" ? "Avenir" : undefined;
const FONT_BOLD = Platform.OS === "ios" ? "Avenir-Heavy" : undefined;

export const USER_NAME_KEY = "higgins_user_name";

const LANGUAGES: Language[] = ["nl", "de", "en"];

export default function OnboardingScreen() {
  const { t, language, setLanguage } = useLanguage();
  const [name, setName] = useState("");
  const [step, setStep] = useState<"intro" | "name" | "welcome">("intro");

  // Animaties
  const logoOpacity  = useSharedValue(0);
  const logoScale    = useSharedValue(0.7);
  const titleOpacity = useSharedValue(0);
  const cardOpacity  = useSharedValue(0);
  const cardY        = useSharedValue(30);

  const logoStyle  = useAnimatedStyle(() => ({ opacity: logoOpacity.value, transform: [{ scale: logoScale.value }] }));
  const titleStyle = useAnimatedStyle(() => ({ opacity: titleOpacity.value }));
  const cardStyle  = useAnimatedStyle(() => ({ opacity: cardOpacity.value, transform: [{ translateY: cardY.value }] }));

  useEffect(() => {
    // Intro animatie
    logoOpacity.value  = withTiming(1, { duration: 800 });
    logoScale.value    = withSpring(1, { damping: 14, stiffness: 100 });
    titleOpacity.value = withDelay(600, withTiming(1, { duration: 600 }));
    cardOpacity.value  = withDelay(1000, withTiming(1, { duration: 500 }));
    cardY.value        = withDelay(1000, withTiming(0, { duration: 500 }));
  }, []);

  const handleContinue = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    await AsyncStorage.setItem(USER_NAME_KEY, trimmed);
    setStep("welcome");
    // Na 2 seconden naar de app
    setTimeout(() => {
      router.replace("/(tabs)");
    }, 2200);
  };

  if (step === "welcome") {
    return (
      <View style={[s.container, { justifyContent: "center", alignItems: "center", gap: 24 }]}>
        <Image
          source={require("@/assets/images/icon.png")}
          style={{ width: 100, height: 100, borderRadius: 24 }}
          contentFit="cover"
        />
        <Text style={[s.welcomeTitle, { textAlign: "center" }]}>
          {t.onboarding.welcome}, {name.trim()}.
        </Text>
        <Text style={[s.welcomeSub, { textAlign: "center", paddingHorizontal: 40 }]}>
          {t.onboarding.subtitle}
        </Text>
        <View style={s.cyanLine} />
        <Text style={[s.welcomeQuote, { textAlign: "center", paddingHorizontal: 48 }]}>
          "The future is now."
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={{ flex: 1, backgroundColor: C.bg }}
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Taalwisselaar ── */}
        <View style={s.langRow}>
          {LANGUAGES.map((lang) => (
            <Pressable
              key={lang}
              style={[s.langBtn, language === lang && s.langBtnActive]}
              onPress={() => setLanguage(lang)}
            >
              <Text style={s.langFlag}>{LANGUAGE_FLAGS[lang]}</Text>
              <Text style={[s.langLabel, language === lang && { color: C.cyan }]}>
                {LANGUAGE_NAMES[lang]}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* ── Logo ── */}
        <Animated.View style={[s.logoContainer, logoStyle]}>
          <Image
            source={require("@/assets/images/icon.png")}
            style={s.logo}
            contentFit="cover"
          />
          <View style={s.cyanGlow} />
        </Animated.View>

        {/* ── Titel ── */}
        <Animated.View style={[s.titleContainer, titleStyle]}>
          <Text style={s.brand}>HIGGINS</Text>
          <Text style={s.brandSub}>MISSION CONTROL</Text>
          <View style={s.cyanLine} />
          <Text style={s.tagline}>The future is now.</Text>
        </Animated.View>

        {/* ── Naam invoer kaart ── */}
        <Animated.View style={[s.card, cardStyle]}>
          <Text style={s.cardTitle}>{t.onboarding.welcome} Higgins MC</Text>
          <Text style={s.cardSub}>{t.onboarding.nameLabel}</Text>

          <TextInput
            style={s.input}
            value={name}
            onChangeText={setName}
            placeholder={t.onboarding.namePlaceholder}
            placeholderTextColor={C.muted}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleContinue}
          />

          <Pressable
            style={({ pressed }) => [
              s.button,
              !name.trim() && s.buttonDisabled,
              pressed && { opacity: 0.85 },
            ]}
            onPress={handleContinue}
            disabled={!name.trim()}
          >
            <Text style={[s.buttonText, !name.trim() && { color: C.muted }]}>
              {t.onboarding.startButton}
            </Text>
          </Pressable>

          <Text style={s.disclaimer}>
            {t.onboarding.nameRequired}
          </Text>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scrollContent: { flexGrow: 1, backgroundColor: C.bg, paddingBottom: 60, alignItems: "center" },

  logoContainer: { marginTop: 80, marginBottom: 32, alignItems: "center", justifyContent: "center" },
  logo: { width: 110, height: 110, borderRadius: 28 },
  cyanGlow: {
    position: "absolute", width: 140, height: 140, borderRadius: 70,
    backgroundColor: "transparent",
    shadowColor: C.cyan, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 40,
  },

  titleContainer: { alignItems: "center", gap: 6, marginBottom: 48 },
  brand: { fontSize: 36, fontWeight: "900", color: C.text, fontFamily: FONT_BOLD, letterSpacing: 8 },
  brandSub: { fontSize: 12, color: C.muted, fontFamily: FONT, letterSpacing: 5, textTransform: "uppercase" },
  cyanLine: { width: 60, height: 1.5, backgroundColor: C.cyan, marginVertical: 12, opacity: 0.7 },
  tagline: { fontSize: 14, color: C.cyan, fontFamily: FONT, fontStyle: "italic", letterSpacing: 0.5 },

  card: {
    width: "100%", maxWidth: 380, paddingHorizontal: 28, paddingVertical: 32,
    backgroundColor: C.surface, borderRadius: 24,
    borderWidth: 1, borderColor: C.cyanBorder,
    gap: 16, alignSelf: "center",
    marginHorizontal: 20,
  },
  cardTitle: { fontSize: 22, fontWeight: "800", color: C.text, fontFamily: FONT_BOLD, textAlign: "center" },
  cardSub: { fontSize: 14, color: C.muted, fontFamily: FONT, textAlign: "center", lineHeight: 21 },

  input: {
    backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border,
    borderRadius: 14, paddingHorizontal: 18, paddingVertical: 14,
    fontSize: 16, color: C.text, fontFamily: FONT,
  },
  button: {
    backgroundColor: C.cyan, borderRadius: 14, paddingVertical: 16,
    alignItems: "center",
    shadowColor: C.cyan, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12,
  },
  buttonDisabled: { backgroundColor: C.surface2, shadowOpacity: 0 },
  buttonText: { fontSize: 16, fontWeight: "800", color: "#0A0C0E", fontFamily: FONT_BOLD },
  disclaimer: { fontSize: 11, color: C.muted, fontFamily: FONT, textAlign: "center" },

  // Welcome scherm
  welcomeTitle: { fontSize: 32, fontWeight: "900", color: C.text, fontFamily: FONT_BOLD, letterSpacing: -0.5 },
  welcomeSub: { fontSize: 15, color: C.muted, fontFamily: FONT, lineHeight: 22 },
  welcomeQuote: { fontSize: 14, color: C.cyan, fontFamily: FONT, fontStyle: "italic" },

  // Taalwisselaar
  langRow: {
    flexDirection: "row", gap: 8, marginTop: 20, marginBottom: 4,
    paddingHorizontal: 20, alignSelf: "flex-end",
  },
  langBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1, borderColor: C.border,
    backgroundColor: C.surface,
  },
  langBtnActive: {
    borderColor: C.cyanBorder, backgroundColor: C.cyanDim,
  },
  langFlag: { fontSize: 16 },
  langLabel: { fontSize: 11, color: C.muted, fontFamily: FONT, fontWeight: "600" },
});
