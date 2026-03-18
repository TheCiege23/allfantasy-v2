/**
 * [NEW] lib/big-brother/BigBrotherRosterReleaseEngine.ts
 * Release evicted roster's players to waivers per config timing. PROMPT 2/6.
 */

import { prisma } from '@/lib/prisma'
import { getRosterPlayerIds } from '@/lib/waiver-wire/roster-utils'
import { getBigBrotherConfig } from './BigBrotherLeagueConfig'
import type { WaiverReleaseTiming } from './types'

/**
 * Clear evicted roster's playerData so players enter waiver/FA pool.
 * Does not process claims; timing (immediate vs next run vs FAAB) is handled by caller/scheduler.
 */
export async function releaseEvictedRoster(leagueId: string, rosterId: string): Promise<void> {
  const roster = await prisma.roster.findFirst({
    where: { leagueId, id: rosterId },
    select: { id: true, playerData: true },
  })
  if (!roster) return

  const emptyData = Array.isArray(roster.playerData) ? [] : { ...(roster.playerData as object), players: [] }
  await prisma.roster.update({
    where: { id: roster.id },
    data: { playerData: emptyData as object },
  })
}

/**
 * Get waiver release timing for league (for scheduler/caller to act on).
 */
export async function getWaiverReleaseTiming(leagueId: string): Promise<WaiverReleaseTiming> {
  const config = await getBigBrotherConfig(leagueId)
  return config?.waiverReleaseTiming ?? 'next_waiver_run'
}
