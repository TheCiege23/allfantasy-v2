/**
 * Orchestrates syncing server-stored preferences to client (language, theme, timezone).
 * Used on app load when user is authenticated: GET /api/user/profile then apply to
 * LanguageProvider, ThemeProvider, and localStorage so UI and formatters stay in sync.
 *
 * This module defines the contract and constants; actual sync is implemented in
 * SyncProfilePreferences component which calls the API and applies results.
 */

export const PREFERENCE_SYNC_API = "/api/user/profile"

export interface SyncResult {
  preferredLanguage: string | null
  themePreference: string | null
  timezone: string | null
}

/**
 * Parse API response into sync result. Used by client sync component.
 */
export function parseProfileForSync(data: Record<string, unknown> | null): SyncResult {
  if (!data) {
    return { preferredLanguage: null, themePreference: null, timezone: null }
  }
  return {
    preferredLanguage:
      data.preferredLanguage === "en" || data.preferredLanguage === "es"
        ? (data.preferredLanguage as string)
        : null,
    themePreference:
      data.themePreference === "light" ||
      data.themePreference === "dark" ||
      data.themePreference === "legacy"
        ? (data.themePreference as string)
        : null,
    timezone: typeof data.timezone === "string" ? data.timezone : null,
  }
}
