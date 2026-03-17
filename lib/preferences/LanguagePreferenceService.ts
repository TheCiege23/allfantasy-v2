/**
 * Language preference: read/write from localStorage (af_lang). Sync to API via PATCH /api/user/profile (preferredLanguage).
 * Uses lib/i18n for constants.
 */

import { LANG_STORAGE_KEY, DEFAULT_LANG, resolveLanguage, type LanguageCode } from "@/lib/i18n/constants"

export type { LanguageCode }

export function getStoredLanguage(): LanguageCode {
  if (typeof window === "undefined") return DEFAULT_LANG
  try {
    return resolveLanguage(window.localStorage.getItem(LANG_STORAGE_KEY))
  } catch {}
  return DEFAULT_LANG
}

export function setStoredLanguage(lang: LanguageCode): void {
  try {
    window.localStorage.setItem(LANG_STORAGE_KEY, lang)
  } catch {}
}
