import {
  DEFAULT_THEME,
  isValidTheme,
  resolveTheme,
  type ThemeId,
} from "@/lib/theme/constants"

export interface ThemePreferenceSyncInput {
  profileThemePreference: string | null
  storedThemePreference: string | null
}

export interface ThemePreferenceSyncResult {
  theme: ThemeId
  shouldPersistToProfile: boolean
}

export function resolveThemePreferenceSync(
  input: ThemePreferenceSyncInput
): ThemePreferenceSyncResult {
  if (isValidTheme(input.profileThemePreference)) {
    return {
      theme: input.profileThemePreference,
      shouldPersistToProfile: false,
    }
  }

  if (isValidTheme(input.storedThemePreference)) {
    return {
      theme: input.storedThemePreference,
      shouldPersistToProfile: true,
    }
  }

  return {
    theme: resolveTheme(DEFAULT_THEME),
    shouldPersistToProfile: false,
  }
}
