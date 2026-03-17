/**
 * Resolve effective theme for UI. Re-exports from lib/theme for backward compatibility.
 * Actual theme state lives in ThemeProvider; resolution and validation come from lib/theme.
 */

import {
  resolveTheme as resolve,
  isValidTheme as isValid,
  THEME_IDS,
  type ThemeId,
} from "@/lib/theme"

export type ThemeMode = ThemeId
export const THEME_MODES: ThemeMode[] = [...THEME_IDS]
export const isValidTheme = isValid
export const resolveTheme = resolve
