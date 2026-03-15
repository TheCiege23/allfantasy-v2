/**
 * Resolves player pool context for the draft room by league (sport- and variant-aware).
 * Delegates to LeaguePlayerPoolBootstrapService; provides draft-specific options (queue size, position filter).
 */
import { getLeaguePlayerPoolContext } from '@/lib/sport-teams/LeaguePlayerPoolBootstrapService'
import { getDraftConfigForLeague } from './DraftRoomConfigResolver'
import type { LeagueSport } from '@prisma/client'

export interface DraftPlayerPoolContext {
  leagueId: string
  leagueSport: LeagueSport
  playerPoolCount: number
  samplePlayerIds: string[]
  queueSizeLimit: number | null
  positionFilterBehavior: string
}

/**
 * Get player pool context for draft room: sport-scoped pool plus draft queue/filter defaults.
 * For NFL IDP leagues, pool includes defensive players; position filter uses league variant.
 */
export async function getDraftPlayerPoolContext(
  leagueId: string,
  leagueSport: LeagueSport,
  options?: { playerLimit?: number }
): Promise<DraftPlayerPoolContext | null> {
  const [poolContext, draftConfig] = await Promise.all([
    getLeaguePlayerPoolContext(leagueId, leagueSport, { playerLimit: options?.playerLimit ?? 2000 }),
    getDraftConfigForLeague(leagueId),
  ])

  return {
    leagueId: poolContext.leagueId,
    leagueSport: poolContext.leagueSport,
    playerPoolCount: poolContext.playerPoolCount,
    samplePlayerIds: poolContext.samplePlayerIds,
    queueSizeLimit: draftConfig?.queue_size_limit ?? null,
    positionFilterBehavior: draftConfig?.position_filter_behavior ?? 'by_eligibility',
  }
}
