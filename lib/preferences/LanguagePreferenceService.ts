/**
 * Language preference: read/write from localStorage (af_lang) and optionally sync to API.
 * API sync is done via PATCH /api/user/profile (preferredLanguage).
 */

const STORAGE_KEY = "af_lang"

export type LanguageCode = "en" | "es"

export function getStoredLanguage(): LanguageCode {
  if (typeof window === "undefined") return "en"
  try {
    const v = window.localStorage.getItem(STORAGE_KEY)
    if (v === "en" || v === "es") return v
  } catch {}
  return "en"
}

export function setStoredLanguage(lang: LanguageCode): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, lang)
  } catch {}
}
