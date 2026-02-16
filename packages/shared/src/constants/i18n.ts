/**
 * Internationalization constants for Festapp Rideshare (PLAT-02).
 *
 * Supports Czech, Slovak, and English with Czech as default.
 */

export const SUPPORTED_LOCALES = ['cs', 'sk', 'en'] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = 'cs';

export const LOCALE_NAMES: Record<SupportedLocale, string> = {
  cs: 'Cestina',
  sk: 'Slovencina',
  en: 'English',
};

export const LOCALE_STORAGE_KEY = 'festapp-locale';
