/**
 * Trade market intelligence — deterministic fair bands + actionable copy.
 */

import { prisma } from '@/lib/prisma'
import { AI_EVENT_TYPES } from '@/lib/ai/events/aiEventTypes'

export type TradeMarketEvaluation = {
  fairLow: number
  fairHigh: number
  acceptanceProbability: number
  riskScore: number
  overpayVsPlatform: number
  underpayVsPlatform: number
  actions: string[]
  leagueBiasNotes: string[]
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n))
}

/**
 * Evaluate a trade package using recent platform acceptance rates + simple value index.
 * `sideValue` is a normalized 0–100 strength estimate per side (callers compute deterministically).
 */
export async function evaluateTradeVsMarket(input: {
  sport: string
  leagueId?: string | null
  sideAGivesValue: number
  sideBGivesValue: number
}): Promise<TradeMarketEvaluation> {
  const { sport, leagueId, sideAGivesValue, sideBGivesValue } = input
  const mid = (sideAGivesValue + sideBGivesValue) / 2 || 50
  const spread = Math.abs(sideAGivesValue - sideBGivesValue)
  const fairLow = clamp01((mid - spread * 0.35) / 100) * 100
  const fairHigh = clamp01((mid + spread * 0.35) / 100) * 100

  let acceptRate = 0.45
  try {
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    const rows = await prisma.aiPlatformEvent.findMany({
      where: {
        sport,
        leagueId: leagueId ?? undefined,
        createdAt: { gte: since },
        eventType: { in: [AI_EVENT_TYPES.TRADE_ACCEPTED, AI_EVENT_TYPES.TRADE_REJECTED] },
      },
      select: { eventType: true },
      take: 4000,
    })
    const acc = rows.filter((r) => r.eventType === AI_EVENT_TYPES.TRADE_ACCEPTED).length
    const rej = rows.filter((r) => r.eventType === AI_EVENT_TYPES.TRADE_REJECTED).length
    const tot = acc + rej
    if (tot > 10) acceptRate = acc / tot
  } catch {
    /* empty */
  }

  const balance = 1 - clamp01(spread / 100)
  const acceptanceProbability = clamp01(balance * 0.7 + acceptRate * 0.3)
  const overpayVsPlatform = Math.max(0, sideAGivesValue - sideBGivesValue)
  const underpayVsPlatform = Math.max(0, sideBGivesValue - sideAGivesValue)
  const riskScore = clamp01(spread / 100) * 100

  const actions: string[] = []
  if (spread > 15) actions.push('Ask for a mid-round pick or swap a bench piece to balance.')
  if (spread > 25) actions.push('Consider countering with a player-for-pick package.')
  if (spread < 5) actions.push('Deal is near parity — push on timeline or FAAB if stalled.')

  const leagueBiasNotes: string[] = []
  if (acceptRate > 0.55) leagueBiasNotes.push('This league accepts at a higher clip than platform sample — moves can close faster.')
  if (acceptRate < 0.35) leagueBiasNotes.push('Low acceptance rate in sample — expect counters; add sweeteners early.')

  return {
    fairLow,
    fairHigh,
    acceptanceProbability,
    riskScore,
    overpayVsPlatform,
    underpayVsPlatform,
    actions,
    leagueBiasNotes,
  }
}
