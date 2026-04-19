import 'server-only'

import { formatInTimeZone } from 'date-fns-tz'

import { prisma } from '@/lib/prisma'
import { estimateNextWaiversProcessUTC } from '@/lib/time-engine/estimateWaiverRun'
import { resolveUserTimezone } from '@/lib/time-engine/resolveTimezone'

export type WaiverTimingForToday = {
  /** True only when we resolved a next instant from DB league fields. */
  nextWaiverProcessKnown: boolean
  /** UTC ISO for next rolling waiver process (league local clock → UTC). */
  nextWaiverProcessIsoUtc: string | null
  /** Human-readable; omit UI if null. */
  waiverTimingHint: string | null
}

/**
 * Uses `League.timezone` + `League.waiverProcessTime` — no invented “tonight” copy.
 */
export async function computeWaiverTimingForLeague(
  leagueId: string | null,
  userId: string,
): Promise<WaiverTimingForToday> {
  if (!leagueId?.trim()) {
    return { nextWaiverProcessKnown: false, nextWaiverProcessIsoUtc: null, waiverTimingHint: null }
  }
  const row = await prisma.league.findUnique({
    where: { id: leagueId.trim() },
    select: { timezone: true, waiverProcessTime: true, name: true },
  })
  if (!row) {
    return { nextWaiverProcessKnown: false, nextWaiverProcessIsoUtc: null, waiverTimingHint: null }
  }
  const next = estimateNextWaiversProcessUTC({
    leagueTimezone: row.timezone,
    waiverProcessTime: row.waiverProcessTime,
  })
  if (!next) {
    return { nextWaiverProcessKnown: false, nextWaiverProcessIsoUtc: null, waiverTimingHint: null }
  }
  const iso = next.toISOString()
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: { timezone: true },
  })
  const tz = resolveUserTimezone(profile?.timezone)
  const local = formatInTimeZone(next, tz, 'EEE MMM d, h:mm a zzz')
  const waiverTimingHint = `Next waiver run ≈ ${local} — from league “${row.name ?? 'league'}” waiver process time + timezone.`
  return {
    nextWaiverProcessKnown: true,
    nextWaiverProcessIsoUtc: iso,
    waiverTimingHint,
  }
}
