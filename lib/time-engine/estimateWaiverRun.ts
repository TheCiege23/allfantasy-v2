import { addDays } from 'date-fns'
import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz'

import { getServerNowUTC } from '@/lib/time-engine/serverClock'
import { resolveUserTimezone } from '@/lib/time-engine/resolveTimezone'

/**
 * Best-effort next waiver processing instant from league-local clock + `waiverProcessTime` (e.g. "02:00").
 * Uses server UTC as truth; returns null if time cannot be parsed.
 */
export function estimateNextWaiversProcessUTC(args: {
  leagueTimezone: string | null | undefined
  waiverProcessTime: string | null | undefined
  serverNow?: Date
}): Date | null {
  const raw = args.waiverProcessTime?.trim()
  if (!raw) return null
  const m = raw.match(/(\d{1,2}):(\d{2})/)
  if (!m) return null
  const hh = Math.min(23, Math.max(0, parseInt(m[1], 10)))
  const mm = Math.min(59, Math.max(0, parseInt(m[2], 10)))
  const tz = resolveUserTimezone(args.leagueTimezone)
  const serverNow = args.serverNow ?? getServerNowUTC()
  const ymd = formatInTimeZone(serverNow, tz, 'yyyy-MM-dd')
  const pad = (n: number) => String(n).padStart(2, '0')
  let candidate = fromZonedTime(`${ymd}T${pad(hh)}:${pad(mm)}:00.000`, tz)
  if (candidate.getTime() <= serverNow.getTime()) {
    const z = toZonedTime(serverNow, tz)
    const nextLocal = addDays(z, 1)
    const ymd2 = formatInTimeZone(nextLocal, tz, 'yyyy-MM-dd')
    candidate = fromZonedTime(`${ymd2}T${pad(hh)}:${pad(mm)}:00.000`, tz)
  }
  return candidate
}
