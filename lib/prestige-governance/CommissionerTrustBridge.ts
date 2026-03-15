/**
 * CommissionerTrustBridge — connects AI Commissioner surface to reputation and legacy context.
 * Used to answer: "Which managers need attention?" and "Who has high commissioner trust?"
 */

import { listReputationsByLeague } from '@/lib/reputation-engine/ManagerTrustQueryService'
import { queryLegacyLeaderboard } from '@/lib/legacy-score-engine/LegacyRankingService'
import { queryHallOfFameEntries } from '@/lib/hall-of-fame-engine/HallOfFameQueryService'
import type { CommissionerTrustContext } from './types'
import { normalizeSportForPrestige } from './SportPrestigeResolver'

const LOW_TRUST_TIERS = new Set(['Risky', 'Neutral'])
const HIGH_COMMISSIONER_TRUST_MIN = 70

/**
 * Build commissioner-facing trust and prestige context for a league.
 * Does not require the current user to be commissioner; used by APIs that enforce commissioner check separately.
 */
export async function buildCommissionerTrustContext(
  leagueId: string,
  options?: { sport?: string | null }
): Promise<CommissionerTrustContext> {
  const sport = options?.sport ? normalizeSportForPrestige(options.sport) : undefined

  const [reputations, legacyResult, hofResult] = await Promise.all([
    listReputationsByLeague(leagueId, { sport, limit: 500 }),
    queryLegacyLeaderboard({
      leagueId,
      sport: sport ?? undefined,
      entityType: 'MANAGER',
      limit: 500,
      offset: 0,
    }),
    queryHallOfFameEntries({
      leagueId,
      sport: sport ?? undefined,
      limit: 1,
      offset: 0,
    }),
  ])

  const lowTrustManagerIds = reputations
    .filter((r) => LOW_TRUST_TIERS.has(r.tier))
    .map((r) => r.managerId)
  const highCommissionerTrustManagerIds = reputations
    .filter((r) => r.commissionerTrustScore >= HIGH_COMMISSIONER_TRUST_MIN)
    .map((r) => r.managerId)

  return {
    leagueId,
    lowTrustManagerIds,
    highCommissionerTrustManagerIds,
    reputationCoverageCount: reputations.length,
    legacyCoverageCount: legacyResult.total,
    hallOfFameEntryCount: hofResult.total,
  }
}
