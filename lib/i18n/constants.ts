/**
 * Multi-language system — English + 4 top US languages.
 * Used by: LanguageProviderClient, LanguageToggle, Settings, SyncProfilePreferences.
 * Storage: localStorage af_lang; API: UserProfile.preferredLanguage.
 */

export type LanguageCode = 'en' | 'es' | 'zh' | 'fil' | 'vi'

export const LANG_STORAGE_KEY = 'af_lang'
export const LANG_COOKIE_KEY = 'af_lang'

export const DEFAULT_LANG: LanguageCode = 'en'

export const SUPPORTED_LANGUAGES: LanguageCode[] = ['en', 'es', 'zh', 'fil', 'vi']

export const LANGUAGE_DISPLAY_NAMES: Record<LanguageCode, string> = {
  en: 'English',
  es: 'Español',
  zh: '中文',
  fil: 'Filipino',
  vi: 'Tiếng Việt',
}

export function getLanguageDisplayName(code: LanguageCode): string {
  return LANGUAGE_DISPLAY_NAMES[code] ?? code
}

export function resolveLanguage(value: string | null | undefined): LanguageCode {
  if (value === 'en' || value === 'es' || value === 'zh' || value === 'fil' || value === 'vi') return value
  return DEFAULT_LANG
}
