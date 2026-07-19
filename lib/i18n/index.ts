/**
 * i18n — Higgins MC
 * Ondersteunde talen: NL (standaard), DE, EN
 */

import { nl } from "./nl";
import { de } from "./de";
import { en } from "./en";
import type { Translations } from "./nl";

export type Language = "nl" | "de" | "en";

export const LANGUAGE_STORAGE_KEY = "higgins_language";

export const translations: Record<Language, Translations> = {
  nl,
  de,
  en,
};

export const LANGUAGE_NAMES: Record<Language, string> = {
  nl: "Nederlands",
  de: "Deutsch",
  en: "English",
};

export const LANGUAGE_FLAGS: Record<Language, string> = {
  nl: "🇳🇱",
  de: "🇩🇪",
  en: "🇬🇧",
};

export function getTranslations(lang: Language): Translations {
  return translations[lang] ?? translations.nl;
}

export type { Translations };
export { nl, de, en };
