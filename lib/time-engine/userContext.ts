import { formatInTimeZone, toZonedTime } from 'date-fns-tz'
import { prisma } from '@/lib/prisma'
import { getServerNowUTC, getServerNowISO } from '@/lib/time-engine/serverClock'
import { getTimeFreshnessSummary } from '@/lib/time-engine/freshness'
import { getFantasyDayWindowUTC } from '@/lib/time-engine/windows'
import { resolveUserTimezone } from '@/lib/time-engine/resolveTimezone'
import { composeFantasyTimeEnginePayload, type FantasyTimeEngineExtras } from '@/lib/time-engine/fantasyTimePayload'
import type { AiTimeContextPayload, UserTimeContext } from '@/lib/time-engine/types'

export async function getUserTimeContext(userId: string): Promise<UserTimeContext> {
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: {
      timezone: true,
      deviceTimezoneLastSeen: true,
      deviceTimeLastSeen: true,
      timeMismatchFlag: true,
    },
  })

  const userTz = resolveUserTimezone(profile?.timezone)
  const server = getServerNowUTC()
  const { windowStartUTC, windowEndUTC, calendarDateInUserTz } = getFantasyDayWindowUTC(userTz, server)

  const userLocalNowISO = formatInTimeZone(server, userTz, "yyyy-MM-dd'T'HH:mm:ss.SSSXXX")
  const zLocal = toZonedTime(server, userTz)
  const userDayOfWeekJs = zLocal.getDay()
  const hour = zLocal.getHours()
  const minute = zLocal.getMinutes()

  const deviceTz = profile?.deviceTimezoneLastSeen?.trim() || null
  const deviceIso = profile?.deviceTimeLastSeen?.toISOString() ?? null

  const timezoneMismatch = Boolean(deviceTz && deviceTz !== userTz)
  const skewSec =
    profile?.deviceTimeLastSeen != null
      ? Math.abs((profile.deviceTimeLastSeen.getTime() - server.getTime()) / 1000)
      : null
  const deviceClockMismatch = skewSec != null && skewSec > 120

  const warnings: string[] = []
  if (timezoneMismatch) warnings.push('Device timezone differs from account timezone — displaying in account timezone.')
  if (deviceClockMismatch) warnings.push('Device clock may differ from official server time — deadlines use server time.')

  const freshnessSummary = getTimeFreshnessSummary({})

  return {
    serverNowUTC: getServerNowISO(),
    serverNowMs: server.getTime(),
    userTimezone: userTz,
    userLocalNowISO,
    userLocalDate: calendarDateInUserTz,
    userDayOfWeek: userDayOfWeekJs,
    userHour: hour,
    userMinute: minute,
    deviceTimezone: deviceTz,
    deviceLocalNowISO: deviceIso,
    deviceTimeLastSeenUTC: deviceIso,
    timezoneMismatch,
    deviceClockMismatch,
    clockSkewSeconds: skewSec,
    currentFantasyDayWindowStartUTC: windowStartUTC.toISOString(),
    currentFantasyDayWindowEndUTC: windowEndUTC.toISOString(),
    lockWindowStatus: 'not_applicable',
    freshnessSummary,
    warnings,
  }
}

export async function buildAiTimeContextPayload(
  userId: string,
  extras?: FantasyTimeEngineExtras
): Promise<AiTimeContextPayload> {
  const base = await getUserTimeContext(userId)
  return composeFantasyTimeEnginePayload(base, extras)
}
