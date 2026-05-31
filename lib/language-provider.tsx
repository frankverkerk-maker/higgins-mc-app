/**
 * LanguageProvider — Higgins MC
 *
 * Beheert de actieve taal van de app (NL / DE / EN).
 * Taalinstelling wordt opgeslagen in AsyncStorage en hersteld bij app-start.
 *
 * Gebruik:
 *   const { t, language, setLanguage } = useLanguage();
 *   <Text>{t.dashboard.title}</Text>
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  type Language,
  type Translations,
  LANGUAGE_STORAGE_KEY,
  getTranslations,
} from "./i18n";

// ─── Context type ─────────────────────────────────────────────────────────────
interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: "nl",
  setLanguage: async () => {},
  t: getTranslations("nl"),
});

// ─── Provider ─────────────────────────────────────────────────────────────────
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("nl");
  const [t, setT] = useState<Translations>(getTranslations("nl"));
  const [loaded, setLoaded] = useState(false);

  // Herstel taalinstelling bij app-start
  useEffect(() => {
    AsyncStorage.getItem(LANGUAGE_STORAGE_KEY).then((stored) => {
      const lang = (stored as Language) ?? "nl";
      setLanguageState(lang);
      setT(getTranslations(lang));
      setLoaded(true);
    });
  }, []);

  const setLanguage = useCallback(async (lang: Language) => {
    setLanguageState(lang);
    setT(getTranslations(lang));
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  }, []);

  // Wacht tot taal geladen is om flash te voorkomen
  if (!loaded) return null;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}
