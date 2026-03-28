/**
 * English / Spanish language system — single source of truth.
 * Used by: LanguageProviderClient, LanguageToggle, Settings, SyncProfilePreferences.
 * Storage: localStorage af_lang; API: UserProfile.preferredLanguage.
 */

export type LanguageCode = 'en' | 'es'

export const LANG_STORAGE_KEY = 'af_lang'
export const LANG_COOKIE_KEY = 'af_lang'

export const DEFAULT_LANG: LanguageCode = 'en'

export const SUPPORTED_LANGUAGES: LanguageCode[] = ['en', 'es']

export const LANGUAGE_DISPLAY_NAMES: Record<LanguageCode, string> = {
  en: 'English',
  es: 'Spanish',
}

export function getLanguageDisplayName(code: LanguageCode): string {
  return LANGUAGE_DISPLAY_NAMES[code] ?? code
}

export function resolveLanguage(value: string | null | undefined): LanguageCode {
  if (value === 'en' || value === 'es') return value
  return DEFAULT_LANG
}
