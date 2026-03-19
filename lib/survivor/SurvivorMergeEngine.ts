/**
 * Survivor merge trigger: determine if league is in merge phase (PROMPT 346). Deterministic.
 */

import { getSurvivorConfig } from './SurvivorLeagueConfig'
import { appendSurvivorAudit } from './SurvivorAuditLog'
import { getActiveRosterIdsForLeague } from './SurvivorRosterState'

/**
 * Check if merge condition is met: by week or by remaining active roster count.
 * Active reflects eliminations minus any successful return-to-island events.
 */
export async function isMergeTriggered(leagueId: string, currentWeek: number): Promise<boolean> {
  const config = await getSurvivorConfig(leagueId)
  if (!config) return false

  if (config.mergeTrigger === 'week' && config.mergeWeek != null) {
    return currentWeek >= config.mergeWeek
  }

  if (config.mergeTrigger === 'player_count' && config.mergePlayerCount != null) {
    const remaining = (await getActiveRosterIdsForLeague(leagueId)).length
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
