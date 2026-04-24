/**
 * Draft intelligence: deterministic signals + hooks for LLM explanation.
 * Complements RecommendationEngine / War Room without replacing them.
 */

import { computeDraftRecommendation, type RecommendationPlayer } from '@/lib/draft-helper/RecommendationEngine'
import { normalizeToSupportedSport } from '@/lib/sport-scope'
import { getPlayerMarketSignal } from '@/lib/ai/memory/aiMemory'

export type DraftIntelligenceSnapshot = {
  bestPick: RecommendationPlayer | null
  valueVsMarket: number
  platformAdp: number | null
  leagueVsPlatformAdpDelta: number | null
  reachVsPlatform: number | null
  personalizedFitScore: number
  formatFitScore: number
  riskScore: number
  confidenceScore: number
  insightLines: string[]
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

/**
 * Build a deterministic draft snapshot for UI + optional LLM narrative.
 */
export async function buildDraftIntelligenceSnapshot(input: {
  sport: string
  season: number
  /** Sleeper/player id when known — improves market signal lookup */
  bestPickPlayerId?: string | null
  available: RecommendationPlayer[]
  teamRoster: Array<{ position: string; team?: string | null; byeWeek?: number | null }>
  rosterSlots: string[]
  round: number
  pickInRound: number
  totalTeams: number
  isDynasty?: boolean
  isSuperflex?: boolean
  platformAdp?: number | null
  leagueEarlyWrRate?: number | null
  draftEligiblePositions?: ReadonlySet<string>
}): Promise<DraftIntelligenceSnapshot> {
  const sport = normalizeToSupportedSport(input.sport)
  const det = computeDraftRecommendation({
    available: input.available,
    teamRoster: input.teamRoster,
    rosterSlots: input.rosterSlots,
    round: input.round,
    pick: input.pickInRound,
    totalTeams: input.totalTeams,
    sport,
    isDynasty: Boolean(input.isDynasty),
    isSF: Boolean(input.isSuperflex),
    mode: 'needs',
    draftEligiblePositions: input.draftEligiblePositions,
  })

  const best = det.recommendation?.player ?? null
  const platformAdp = input.platformAdp ?? best?.adp ?? null
  const valueVsMarket = clamp(det.recommendation?.adpEdge ?? 0, -40, 40)

  let leagueVsPlatformAdpDelta: number | null = null
  if (input.leagueEarlyWrRate != null) {
    leagueVsPlatformAdpDelta = clamp((input.leagueEarlyWrRate - 0.28) * 40, -15, 15)
  }

  let marketNotes: string[] = []
  if (input.bestPickPlayerId) {
    const sig = await getPlayerMarketSignal(input.bestPickPlayerId, sport, input.season)
    marketNotes = sig.notes
  }

  const reachVsPlatform =
    det.recommendation != null && det.recommendation.adpEdge < -8 ? Math.abs(det.recommendation.adpEdge) : null

  const personalizedFitScore = clamp(60 + valueVsMarket * 1.2 + (det.recommendation?.needScore ?? 50) * 0.25, 0, 100)
  const formatFitScore = clamp(55 + (input.isSuperflex ? 8 : 0) + (input.isDynasty ? 5 : 0), 0, 100)
  const riskScore = clamp(100 - (det.recommendation?.confidence ?? 50), 0, 100)
  const confidenceScore = clamp(det.recommendation?.confidence ?? 55, 0, 100)

  const insightLines: string[] = [
    det.explanation?.slice(0, 200) ?? 'Board-driven recommendation.',
    ...marketNotes,
  ]
  if (leagueVsPlatformAdpDelta != null && Math.abs(leagueVsPlatformAdpDelta) > 3) {
    insightLines.push(
      leagueVsPlatformAdpDelta > 0
        ? 'This league trends earlier at WR vs platform average — adjust tiers.'
        : 'This league is patient at WR vs platform — value may slide.',
    )
  }
  if (reachVsPlatform != null && reachVsPlatform > 10) {
    insightLines.push('Current pick is a reach vs platform ADP — confirm role/usage upside.')
  }

  return {
    bestPick: best,
    valueVsMarket,
    platformAdp,
    leagueVsPlatformAdpDelta,
    reachVsPlatform,
    personalizedFitScore,
    formatFitScore,
    riskScore,
    confidenceScore,
    insightLines,
  }
}
