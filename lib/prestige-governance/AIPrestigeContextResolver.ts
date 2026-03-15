/**
 * AIPrestigeContextResolver — builds combined governance, trust, legacy, and Hall of Fame context for AI prompts.
 * Use in commissioner tools, explain endpoints, and chimmy/chat so AI can reference prestige consistently.
 */

import { buildCommissionerTrustContext } from './CommissionerTrustBridge'
import { queryLegacyLeaderboard } from '@/lib/legacy-score-engine/LegacyRankingService'
import { queryHallOfFameEntries, queryHallOfFameMoments } from '@/lib/hall-of-fame-engine/HallOfFameQueryService'
import { DEFAULT_SPORT } from '@/lib/sport-scope'
import type { AIPrestigeContextPayload } from './types'
import { normalizeSportForPrestige } from './SportPrestigeResolver'

export async function buildAIPrestigeContext(
  leagueId: string,
  sport?: string | null
): Promise<AIPrestigeContextPayload> {
  const sportNorm = sport ? normalizeSportForPrestige(sport) : undefined

  const [commissionerContext, legacyResult, hofEntriesResult, hofMomentsResult] = await Promise.all([
    buildCommissionerTrustContext(leagueId, { sport: sportNorm }),
    queryLegacyLeaderboard({
      leagueId,
      sport: sportNorm ?? undefined,
      entityType: 'MANAGER',
      limit: 5,
      offset: 0,
    }),
    queryHallOfFameEntries({
      leagueId,
      sport: sportNorm ?? undefined,
      limit: 5,
      offset: 0,
    }),
    queryHallOfFameMoments({
      leagueId,
      sport: sportNorm ?? undefined,
      limit: 5,
      offset: 0,
    }),
  ])

  const govParts: string[] = []
  if (commissionerContext.lowTrustManagerIds.length > 0) {
    govParts.push(
      `${commissionerContext.lowTrustManagerIds.length} manager(s) with low trust (Risky/Neutral).`
    )
  }
  if (commissionerContext.highCommissionerTrustManagerIds.length > 0) {
    govParts.push(
      `${commissionerContext.highCommissionerTrustManagerIds.length} manager(s) with high commissioner trust.`
    )
  }
  govParts.push(
    `Reputation coverage: ${commissionerContext.reputationCoverageCount} managers. Legacy coverage: ${commissionerContext.legacyCoverageCount}.`
  )
  const governanceSummary = govParts.join(' ') || 'No commissioner trust alerts.'

  const reputationSummary =
    commissionerContext.reputationCoverageCount > 0
      ? `Trust scores available for ${commissionerContext.reputationCoverageCount} managers. Tiers: Legendary, Elite, Trusted, Reliable, Neutral, Risky.`
      : 'No reputation records yet; run reputation engine in league settings.'

  const legacySummary =
    legacyResult.total > 0
      ? `Legacy leaderboard has ${legacyResult.total} records. Top scores from championships, playoffs, consistency, rivalry, dynasty.`
      : 'No legacy scores yet; run legacy engine from Legacy tab.'

  const hallOfFameSummary =
    commissionerContext.hallOfFameEntryCount > 0 || hofMomentsResult.total > 0
      ? `Hall of Fame: ${commissionerContext.hallOfFameEntryCount} inductions, ${hofMomentsResult.total} moments.`
      : 'No Hall of Fame inductions or moments yet; use Sync moments in Hall of Fame tab.'

  const combinedHint = [
    governanceSummary,
    reputationSummary,
    legacySummary,
    hallOfFameSummary,
  ].join(' ')

  return {
    sport: sportNorm ?? DEFAULT_SPORT,
    leagueId,
    governanceSummary,
    reputationSummary,
    legacySummary,
    hallOfFameSummary,
    combinedHint,
  }
}
