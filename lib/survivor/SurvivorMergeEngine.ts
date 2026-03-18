/**
 * Survivor merge trigger: determine if league is in merge phase (PROMPT 346). Deterministic.
 */

import { prisma } from '@/lib/prisma'
import { getSurvivorConfig } from './SurvivorLeagueConfig'
import { appendSurvivorAudit } from './SurvivorAuditLog'

/**
 * Check if merge condition is met: by week or by remaining active roster count.
 * Active = rosters that have not been eliminated (no row in council.eliminatedRosterId for them).
 */
export async function isMergeTriggered(leagueId: string, currentWeek: number): Promise<boolean> {
  const config = await getSurvivorConfig(leagueId)
  if (!config) return false

  if (config.mergeTrigger === 'week' && config.mergeWeek != null) {
    return currentWeek >= config.mergeWeek
  }

  if (config.mergeTrigger === 'player_count' && config.mergePlayerCount != null) {
    const rosters = await prisma.roster.findMany({
      where: { leagueId },
      select: { id: true },
    })
    const eliminated = await prisma.survivorTribalCouncil.findMany({
      where: { leagueId },
      select: { eliminatedRosterId: true },
    })
    const eliminatedIds = new Set(eliminated.map((c) => c.eliminatedRosterId).filter(Boolean))
    const remaining = rosters.filter((r) => !eliminatedIds.has(r.id)).length
    return remaining <= config.mergePlayerCount
  }

  return false
}

/**
 * Record merge in audit (call when transition happens). Phase is merge from this week on.
 */
export async function recordMerge(leagueId: string, week: number): Promise<void> {
  const config = await getSurvivorConfig(leagueId)
  if (!config) return
  await appendSurvivorAudit(leagueId, config.configId, 'merge', { week })
}
