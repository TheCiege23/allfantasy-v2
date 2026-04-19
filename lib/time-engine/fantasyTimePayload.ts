import { getLockUrgency } from '@/lib/time-engine/urgency'
import { getTimeFreshnessSummary } from '@/lib/time-engine/freshness'
import { buildRelativeCalendarHints } from '@/lib/time-engine/naturalLanguageCalendar'
import { describeSportWindowStatus } from '@/lib/time-engine/sportWindowHint'
import type { AiTimeContextPayload, UserTimeContext } from '@/lib/time-engine/types'
import { normalizeToSupportedSport, type SupportedSport } from '@/lib/sport-scope'

export type FantasyTimeEngineExtras = Partial<{
  injuriesLastUpdatedAt: string | Date | null
  scoresLastUpdatedAt: string | Date | null
  projectionsLastUpdatedAt: string | Date | null
  newsLastUpdatedAt: string | Date | null
  liveScoresLastUpdatedAt: string | Date | null
  waiversProcessAt: string | Date | null
  matchupLockAt: string | Date | null
  tradeExpiresAt: string | Date | null
  /** Primary sport for window hint (optional). */
  sportHint: SupportedSport | string | null
}>

function iso(d: string | Date | null | undefined): string | null {
  if (d == null) return null
  const x = d instanceof Date ? d : new Date(d)
  return Number.isNaN(x.getTime()) ? null : x.toISOString()
}

/**
 * Central composer: server UTC + account TZ + device signals + locks + freshness + AI hints.
 */
export function composeFantasyTimeEnginePayload(
  base: UserTimeContext,
  extras?: FantasyTimeEngineExtras
): AiTimeContextPayload {
  const server = new Date(base.serverNowUTC)
  const lockAt = extras?.matchupLockAt ? new Date(extras.matchupLockAt as string) : null
  const lockU = getLockUrgency(lockAt, { serverNow: server })

  let timeUntilNextLockMs: number | null = lockU.msUntil
  if (lockU.msUntil != null && lockU.msUntil < 0) timeUntilNextLockMs = 0

  const waiversAt = extras?.waiversProcessAt ? new Date(extras.waiversProcessAt as string) : null
  let timeUntilWaiversMs: number | null = null
  if (waiversAt && !Number.isNaN(waiversAt.getTime())) {
    const w = waiversAt.getTime() - server.getTime()
    timeUntilWaiversMs = w < 0 ? 0 : w
  }

  const tradeAt = extras?.tradeExpiresAt ? new Date(extras.tradeExpiresAt as string) : null
  let timeUntilTradeExpiryMs: number | null = null
  if (tradeAt && !Number.isNaN(tradeAt.getTime())) {
    const t = tradeAt.getTime() - server.getTime()
    timeUntilTradeExpiryMs = t < 0 ? 0 : t
  }

  const freshnessParts = {
    injuriesLastUpdatedAt: extras?.injuriesLastUpdatedAt ?? null,
    scoresLastUpdatedAt: extras?.scoresLastUpdatedAt ?? null,
    projectionsLastUpdatedAt: extras?.projectionsLastUpdatedAt ?? null,
    newsLastUpdatedAt: extras?.newsLastUpdatedAt ?? null,
    liveScoresLastUpdatedAt: extras?.liveScoresLastUpdatedAt ?? null,
  }

  const freshnessSummary = getTimeFreshnessSummary({
    injuriesLastUpdatedAt: freshnessParts.injuriesLastUpdatedAt ?? undefined,
    scoresLastUpdatedAt: freshnessParts.scoresLastUpdatedAt ?? undefined,
    projectionsLastUpdatedAt: freshnessParts.projectionsLastUpdatedAt ?? undefined,
    newsLastUpdatedAt: freshnessParts.newsLastUpdatedAt ?? undefined,
    liveScoresLastUpdatedAt: freshnessParts.liveScoresLastUpdatedAt ?? undefined,
  })

  const rel = buildRelativeCalendarHints({
    userTimezone: base.userTimezone,
    serverNowUTC: server,
  })

  const sport = extras?.sportHint != null ? normalizeToSupportedSport(String(extras.sportHint)) : 'NFL'
  const sportWin = describeSportWindowStatus({
    sport,
    userLocalHour: base.userHour,
    userLocalDayOfWeek: base.userDayOfWeek,
  })

  const matchupLockIso = iso(extras?.matchupLockAt ?? undefined)
  const waiversIso = iso(extras?.waiversProcessAt ?? undefined)
  const tradeIso = iso(extras?.tradeExpiresAt ?? undefined)

  return {
    schemaVersion: 1,
    serverNowUTC: base.serverNowUTC,
    currentServerTimeUTC: base.serverNowUTC,
    userTimezone: base.userTimezone,
    userLocalTime: base.userLocalNowISO,
    userLocalCalendarDate: base.userLocalDate,
    currentUserDate: base.userLocalDate,
    userDayOfWeek: base.userDayOfWeek,
    currentUserDayOfWeek: base.userDayOfWeek,
    currentUserDayOfWeekName: rel.userDayOfWeekName,
    deviceTimezone: base.deviceTimezone,
    deviceLocalTime: base.deviceLocalNowISO,
    timezoneMismatch: base.timezoneMismatch,
    deviceClockMismatch: base.deviceClockMismatch,
    clockSkewSeconds: base.clockSkewSeconds,
    currentFantasyDayWindow: {
      startUTC: base.currentFantasyDayWindowStartUTC,
      endUTC: base.currentFantasyDayWindowEndUTC,
      calendarDateUserTz: base.userLocalDate,
    },
    currentFantasyDayWindowStartUTC: base.currentFantasyDayWindowStartUTC,
    currentFantasyDayWindowEndUTC: base.currentFantasyDayWindowEndUTC,
    lockWindowStatus: lockU.status,
    freshnessSummary,
    dataFreshness: {
      injuriesLastUpdatedAt: iso(freshnessParts.injuriesLastUpdatedAt ?? undefined),
      scoresLastUpdatedAt: iso(freshnessParts.scoresLastUpdatedAt ?? undefined),
      projectionsLastUpdatedAt: iso(freshnessParts.projectionsLastUpdatedAt ?? undefined),
      newsLastUpdatedAt: iso(freshnessParts.newsLastUpdatedAt ?? undefined),
      liveScoresLastUpdatedAt: iso(freshnessParts.liveScoresLastUpdatedAt ?? undefined),
    },
    relativeCalendarHints: {
      todayInUserTz: rel.todayInUserTz,
      tomorrowDateInUserTz: rel.tomorrowDateInUserTz,
      tonightWindowLabel: rel.tonightWindowLabel,
      thisWeekLabel: rel.thisWeekLabel,
    },
    sportWindow: {
      likelyActive: sportWin.likelyActive,
      note: sportWin.note,
      sportUsed: sport,
    },
    officialTimeAuthority: 'server_utc_plus_account_timezone',
    injuriesLastUpdatedAt: iso(freshnessParts.injuriesLastUpdatedAt ?? undefined),
    scoresLastUpdatedAt: iso(freshnessParts.scoresLastUpdatedAt ?? undefined),
    projectionsLastUpdatedAt: iso(freshnessParts.projectionsLastUpdatedAt ?? undefined),
    newsLastUpdatedAt: iso(freshnessParts.newsLastUpdatedAt ?? undefined),
    liveScoresLastUpdatedAt: iso(freshnessParts.liveScoresLastUpdatedAt ?? undefined),
    waiversProcessAt: waiversIso,
    matchupLockAt: matchupLockIso,
    nextLockTimeUTC: matchupLockIso,
    tradeExpiresAt: tradeIso,
    timeUntilNextLockMs,
    timeUntilWaiversMs,
    timeUntilTradeExpiryMs,
    timeAuthorityNote:
      'Deadlines and locks use server UTC; display uses account timezone; device clock is advisory only.',
  }
}
