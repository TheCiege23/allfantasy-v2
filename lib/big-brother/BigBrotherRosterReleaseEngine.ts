/**
 * [UPDATED] lib/big-brother/BigBrotherRosterReleaseEngine.ts
 * Release evicted roster's players to waivers per config timing.
 * Archives roster snapshot before clearing for historical record.
 */

import { prisma } from '@/lib/prisma'
import { getBigBrotherConfig } from './BigBrotherLeagueConfig'
import { appendBigBrotherAudit } from './BigBrotherAuditLog'
import type { WaiverReleaseTiming } from './types'

/**
 * Archive the evicted roster state before clearing, then release players to waivers.
 * The archive is stored as an audit log entry with the full playerData snapshot.
 */
export async function releaseEvictedRoster(
  leagueId: string,
  rosterId: string,
  options?: { week?: number; cycleId?: string }
): Promise<void> {
  const roster = await prisma.roster.findFirst({
    where: { leagueId, id: rosterId },
    select: { id: true, playerData: true, platformUserId: true },
  })
  if (!roster) return

  // Archive the roster snapshot before clearing
  const config = await prisma.bigBrotherLeagueConfig.findUnique({
    where: { leagueId },
    select: { id: true },
  })
  if (config) {
    await appendBigBrotherAudit(leagueId, config.id, 'roster_archived', {
      rosterId,
      userId: roster.platformUserId,
      week: options?.week,
      cycleId: options?.cycleId,
      playerDataSnapshot: roster.playerData,
    })
  }

  // Clear playerData to release players to waiver/FA pool
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
