import { DEFAULT_TIMEZONE, isValidTimezone } from '@/lib/preferences/TimezonePreferenceService'
import { isValidIanaTimeZone } from '@/lib/timezone'

/** Prefer stored profile value; allow any valid IANA if user was set outside signup list. */
export function resolveUserTimezone(stored: string | null | undefined): string {
  if (!stored || typeof stored !== 'string' || !stored.trim()) return DEFAULT_TIMEZONE
  const t = stored.trim()
  if (isValidTimezone(t) || isValidIanaTimeZone(t)) return t
  return DEFAULT_TIMEZONE
}
