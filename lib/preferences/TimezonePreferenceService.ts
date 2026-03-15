/**
 * Timezone preference: stored on server (UserProfile.timezone). No client localStorage for timezone.
 * Read via GET /api/user/profile; write via PATCH /api/user/profile (timezone).
 * Formatting uses TimezoneFormattingResolver with the user's IANA timezone.
 */

export type TimezoneIana = string

export const DEFAULT_TIMEZONE = "America/New_York"

/**
 * Validates that a string is a known IANA-like timezone (basic check).
 */
export function isValidTimezone(value: string | null | undefined): value is string {
  if (value == null || typeof value !== "string") return false
  return value.length > 0 && value.length < 64
}
