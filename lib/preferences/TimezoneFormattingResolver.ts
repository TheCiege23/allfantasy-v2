/**
 * Format dates/times in the user's preferred timezone.
 * Use for game times, league deadlines, schedule data across Sports App, Bracket, Legacy.
 */

export type TimezoneIana = string

const DEFAULT_TIMEZONE = "America/New_York"

/**
 * Format a Date or ISO string in the given IANA timezone.
 * Uses Intl.DateTimeFormat with timeZone.
 */
export function formatInTimezone(
  date: Date | string | number,
  timezone: TimezoneIana | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    dateStyle: "short",
    timeStyle: "short",
    hour12: true,
  }
): string {
  const tz = timezone && timezone.length > 0 ? timezone : DEFAULT_TIMEZONE
  const d = typeof date === "object" && "getTime" in date ? date : new Date(date)
  try {
    return new Intl.DateTimeFormat("en-US", { ...options, timeZone: tz }).format(d)
  } catch {
    return new Intl.DateTimeFormat("en-US", { ...options, timeZone: DEFAULT_TIMEZONE }).format(d)
  }
}

/**
 * Format time only in the user's timezone.
 */
export function formatTimeInTimezone(
  date: Date | string | number,
  timezone: TimezoneIana | null | undefined
): string {
  return formatInTimezone(date, timezone, { timeStyle: "short", hour12: true })
}

/**
 * Format date only in the user's timezone.
 */
export function formatDateInTimezone(
  date: Date | string | number,
  timezone: TimezoneIana | null | undefined
): string {
  return formatInTimezone(date, timezone, { dateStyle: "short" })
}
