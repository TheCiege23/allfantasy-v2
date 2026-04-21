/**
 * Serialize intelligence layer for Chimmy / tool-augmented chat (deterministic JSON, not vibes).
 */

import { getRecommendationContext } from '@/lib/ai/memory/aiMemory'

export async function buildChimmyIntelligenceContextBlock(params: {
  userId?: string | null
  leagueId?: string | null
  sport: string
  season: number
  playerIds?: string[]
  leagueType?: string
  scoringProfile?: string
}): Promise<string> {
  try {
    const ctx = await getRecommendationContext(params)
    const slim = {
      market: ctx.marketState,
      userTendencies: ctx.userProfile?.tendencies
        ? {
            rookieBias: ctx.userProfile.tendencies.rookieBiasScore,
            risk: ctx.userProfile.tendencies.riskToleranceScore,
            tradeAgg: ctx.userProfile.tendencies.tradeAggressionScore,
            waiver: ctx.userProfile.tendencies.waiverActivityScore,
            aiFollow: ctx.userProfile.tendencies.aiFollowRate,
          }
        : null,
      leagueBaselines: ctx.leagueProfile?.metrics
        ? {
            rookieWeight: ctx.leagueProfile.metrics.rookieValueWeight,
            waiverAgg: ctx.leagueProfile.metrics.waiverAggressionScore,
            tradeAgg: ctx.leagueProfile.metrics.tradeAggressionScore,
            posWeights: ctx.leagueProfile.metrics.positionValueWeights,
          }
        : null,
      playerNotes: Object.fromEntries(
        Object.entries(ctx.playerSignals).map(([id, s]) => [id, s.notes]),
      ),
    }
    return `INTELLIGENCE_LAYER_JSON:\n${JSON.stringify(slim)}`
  } catch {
    return ''
  }
}
