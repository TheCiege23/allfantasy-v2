/**
 * Theme preference: read/write from localStorage (af_mode). Sync to API via PATCH /api/user/profile (themePreference).
 * Uses lib/theme for constants and resolution.
 */

import {
  THEME_STORAGE_KEY,
  THEME_COOKIE_KEY,
  DEFAULT_THEME,
  resolveTheme,
  type ThemeId,
} from "@/lib/theme"
import { applyThemeToDocument } from "@/lib/preferences/HtmlPreferenceSync"

export type ThemeMode = ThemeId

export function getStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return DEFAULT_THEME
  try {
    const v = window.localStorage.getItem(THEME_STORAGE_KEY)
    return resolveTheme(v)
  } catch {}
  return DEFAULT_THEME
}

export function setStoredTheme(mode: ThemeMode): void {
  const resolvedMode = resolveTheme(mode)
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, resolvedMode)
  } catch {}
  try {
    document.cookie = `${THEME_COOKIE_KEY}=${resolvedMode}; path=/; max-age=31536000; samesite=lax`
  } catch {}
  try {
    applyThemeToDocument(resolvedMode)
  } catch {}
}
