import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'
import { getServerNowUTC } from '@/lib/time-engine/serverClock'
import { resolveUserTimezone } from '@/lib/time-engine/resolveTimezone'

/**
 * Calendar-day bounds in the user's timezone, expressed as UTC instants.
 */
export function getFantasyDayWindowUTC(userTimezone: string | null | undefined, serverNow?: Date): {
  windowStartUTC: Date
  windowEndUTC: Date
  calendarDateInUserTz: string
} {
  const tz = resolveUserTimezone(userTimezone)
  const now = serverNow ?? getServerNowUTC()
  const ymd = formatInTimeZone(now, tz, 'yyyy-MM-dd')
  const start = fromZonedTime(`${ymd}T00:00:00.000`, tz)
  const end = fromZonedTime(`${ymd}T23:59:59.999`, tz)
  return { windowStartUTC: start, windowEndUTC: end, calendarDateInUserTz: ymd }
}
