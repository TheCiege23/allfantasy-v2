/**
 * Resolve effective theme for UI. Used by shells and components that need to know current theme.
 * Actual theme state lives in ThemeProvider; this module provides helpers for validation and defaults.
 */

export type ThemeMode = "light" | "dark" | "legacy"

export const THEME_MODES: ThemeMode[] = ["light", "dark", "legacy"]

export function isValidTheme(value: string | null | undefined): value is ThemeMode {
  return value === "light" || value === "dark" || value === "legacy"
}

export function resolveTheme(value: string | null | undefined): ThemeMode {
  if (value === "light" || value === "dark" || value === "legacy") return value
  return "legacy"
}
