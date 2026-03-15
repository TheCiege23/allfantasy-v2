/**
 * Theme preference: read/write from localStorage (af_mode) and optionally sync to API.
 * API sync is done via PATCH /api/user/profile (themePreference).
 */

const STORAGE_KEY = "af_mode"

export type ThemeMode = "light" | "dark" | "legacy"

export function getStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "legacy"
  try {
    const v = window.localStorage.getItem(STORAGE_KEY)
    if (v === "light" || v === "dark" || v === "legacy") return v
  } catch {}
  return "legacy"
}

export function setStoredTheme(mode: ThemeMode): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, mode)
  } catch {}
}
