/**
 * Global theme system — single source of truth for Light, Dark, AF Legacy.
 * Used by: ThemeProvider, ModeToggle, layout script, SyncProfilePreferences, API profile.
 * Applies across: Landing, Sports app, AI tools, Dashboard.
 */

export type ThemeId = 'light' | 'dark' | 'legacy'

export const THEME_STORAGE_KEY = 'af_mode'

/** Default theme when none is stored (must match layout script default). */
export const DEFAULT_THEME: ThemeId = 'legacy'

export const THEME_IDS: ThemeId[] = ['light', 'dark', 'legacy']

export const THEME_DISPLAY_NAMES: Record<ThemeId, string> = {
  light: 'Light',
  dark: 'Dark',
  legacy: 'AF Legacy',
}

export function getThemeDisplayName(id: ThemeId): string {
  return THEME_DISPLAY_NAMES[id] ?? id
}

export function isValidTheme(value: string | null | undefined): value is ThemeId {
  return value === 'light' || value === 'dark' || value === 'legacy'
}

/** Resolve unknown value to a valid theme (default: legacy). */
export function resolveTheme(value: string | null | undefined): ThemeId {
  if (value === 'light' || value === 'dark' || value === 'legacy') return value
  return DEFAULT_THEME
}

/** Cycle order: light → dark → legacy → light. */
export function getNextTheme(current: ThemeId): ThemeId {
  if (current === 'light') return 'dark'
  if (current === 'dark') return 'legacy'
  return 'light'
}
