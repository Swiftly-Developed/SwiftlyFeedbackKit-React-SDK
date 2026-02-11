/**
 * FeedbackKit Internationalization
 *
 * Lightweight i18n system with auto locale detection, fallback to English,
 * and support for consumer overrides.
 */

import { Platform, NativeModules } from 'react-native';
import { en } from './strings';
import { es } from './translations/es';
import { fr } from './translations/fr';
import { de } from './translations/de';
import { ja } from './translations/ja';
import { zhHans } from './translations/zh-Hans';
import { ptBR } from './translations/pt-BR';
import { ko } from './translations/ko';
import { it } from './translations/it';
import { ar } from './translations/ar';
import { ru } from './translations/ru';

type TranslationMap = Record<string, string>;

const builtInTranslations: Record<string, TranslationMap> = {
  en,
  es,
  fr,
  de,
  ja,
  'zh-Hans': zhHans,
  'pt-BR': ptBR,
  ko,
  it,
  ar,
  ru,
};

let currentLocale = 'en';
let overrideStrings: TranslationMap = {};

/**
 * Detect the device locale.
 */
function detectDeviceLocale(): string {
  try {
    let locale: string | undefined;

    if (Platform.OS === 'ios') {
      locale =
        NativeModules.SettingsManager?.settings?.AppleLocale ??
        NativeModules.SettingsManager?.settings?.AppleLanguages?.[0];
    } else {
      locale = NativeModules.I18nManager?.localeIdentifier;
    }

    if (!locale) return 'en';

    // Normalize: "en_US" -> "en", "zh_Hans_CN" -> "zh-Hans", "pt_BR" -> "pt-BR"
    locale = locale.replace(/_/g, '-');

    // Try exact match first (e.g. "pt-BR")
    if (builtInTranslations[locale]) return locale;

    // Try with script (e.g. "zh-Hans" from "zh-Hans-CN")
    const parts = locale.split('-');
    if (parts.length >= 2) {
      const withScript = `${parts[0]}-${parts[1]}`;
      if (builtInTranslations[withScript]) return withScript;
    }

    // Try base language (e.g. "es" from "es-MX")
    if (builtInTranslations[parts[0]]) return parts[0];

    return 'en';
  } catch {
    return 'en';
  }
}

// Auto-detect on module load
currentLocale = detectDeviceLocale();

/**
 * Get a translated string by key.
 *
 * Lookup order:
 * 1. Consumer overrides
 * 2. Built-in translation for current locale
 * 3. English fallback
 */
export function t(key: string): string {
  return overrideStrings[key] ?? builtInTranslations[currentLocale]?.[key] ?? en[key] ?? key;
}

/**
 * Set the current locale.
 */
export function setLocale(locale: string): void {
  currentLocale = locale;
}

/**
 * Get the current locale.
 */
export function getLocale(): string {
  return currentLocale;
}

/**
 * Register custom translations for a locale.
 * These are merged with built-in translations.
 */
export function registerTranslations(locale: string, strings: TranslationMap): void {
  builtInTranslations[locale] = {
    ...builtInTranslations[locale],
    ...strings,
  };
}

/**
 * Set override strings that take highest priority.
 * Useful for consumer apps that want to customize specific strings.
 */
export function setOverrideStrings(strings: TranslationMap): void {
  overrideStrings = { ...overrideStrings, ...strings };
}

export { en } from './strings';
