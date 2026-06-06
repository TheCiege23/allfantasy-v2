/**
 * Multi-language system for AllFantasy.
 * Used by: LanguageProviderClient, LanguageToggle, Settings, SyncProfilePreferences.
 * Storage: localStorage af_lang; API: UserProfile.preferredLanguage.
 */

export type LanguageCode = 'en' | 'es' | 'zh' | 'fil' | 'vi' | 'fr' | 'ar'

export const LANG_STORAGE_KEY = 'af_lang'
export const LANG_COOKIE_KEY = 'af_lang'

export const DEFAULT_LANG: LanguageCode = 'en'

export const SUPPORTED_LANGUAGES: LanguageCode[] = ['en', 'es', 'zh', 'fil', 'vi', 'fr', 'ar']

export const LANGUAGE_DISPLAY_NAMES: Record<LanguageCode, string> = {
  en: 'English',
  es: 'Espa\u00f1ol',
  zh: '\u4e2d\u6587',
  fil: 'Filipino',
  vi: 'Ti\u1ebfng Vi\u1ec7t',
  fr: 'Fran\u00e7ais',
  ar: '\u0627\u0644\u0639\u0631\u0628\u064a\u0629',
}

export function getLanguageDisplayName(code: LanguageCode): string {
  return LANGUAGE_DISPLAY_NAMES[code] ?? code
}

export function resolveLanguage(value: string | null | undefined): LanguageCode {
  if (
    value === 'en' ||
    value === 'es' ||
    value === 'zh' ||
    value === 'fil' ||
    value === 'vi' ||
    value === 'fr' ||
    value === 'ar'
  ) return value
  return DEFAULT_LANG
}
