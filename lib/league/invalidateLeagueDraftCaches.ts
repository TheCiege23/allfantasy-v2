import { deleteApiCachedKeysWithPrefix, clearDedupeKey } from '@/lib/api-performance'
import { clearEffectiveLeagueRosterTemplateCache } from '@/lib/league/getEffectiveLeagueRosterTemplate'

/**
 * After roster or template-affecting league updates: drop in-memory draft pool API cache,
 * short-lived effective-template memo, and the draft session dedupe key so the next read is fresh.
 */
export function invalidateLeagueDraftCaches(leagueId: string): void {
  const poolPrefix = `draft_pool:${leagueId}:`
  deleteApiCachedKeysWithPrefix(poolPrefix)
  clearEffectiveLeagueRosterTemplateCache(leagueId)
  clearDedupeKey(`draft:session:${leagueId}`)
}
