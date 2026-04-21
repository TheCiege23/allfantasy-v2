/**
 * Waiver / FAAB intelligence from platform bids + adds.
 */

import { prisma } from '@/lib/prisma'
import { AI_EVENT_TYPES } from '@/lib/ai/events/aiEventTypes'

export type WaiverMarketSuggestion = {
  suggestedBidPercent: number
  confidence: number
  marketDemand: number
  stashScore: number
  immediateImpactScore: number
  leagueFit: number
  personalizedPriority: number
  notes: string[]
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

export async function suggestWaiverBid(input: {
  sport: string
  leagueId?: string | null
  userAggression?: number | null
  baselineNeed: number
}): Promise<WaiverMarketSuggestion> {
  const { sport, leagueId, userAggression, baselineNeed } = input
  let avgBid = 12
  let demand = 0.5

  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const bids = await prisma.aiPlatformEvent.findMany({
      where: {
        sport,
        leagueId: leagueId ?? undefined,
        eventType: AI_EVENT_TYPES.WAIVER_BID_SUBMITTED,
        createdAt: { gte: since },
      },
      select: { payload: true },
      take: 2000,
    })
    const amounts: number[] = []
    for (const b of bids) {
      const pl = (b.payload ?? {}) as Record<string, unknown>
      const amt = typeof pl.bidAmount === 'number' ? pl.bidAmount : Number(pl.bid ?? NaN)
      if (Number.isFinite(amt)) amounts.push(amt)
    }
    if (amounts.length > 0) {
      avgBid = amounts.reduce((a, b) => a + b, 0) / amounts.length
    }
    demand = clamp(amounts.length / 400, 0.1, 1)
  } catch {
    /* defaults */
  }

  const agg = userAggression ?? 0.5
  const suggestedBidPercent = clamp(avgBid * (0.85 + agg * 0.25) + baselineNeed * 0.15, 1, 100)
  const confidence = clamp(0.55 + demand * 0.25 + (userAggression != null ? 0.1 : 0), 0, 1)
  const marketDemand = demand
  const stashScore = clamp(1 - baselineNeed / 100, 0, 1)
  const immediateImpactScore = clamp(baselineNeed / 100, 0, 1)
  const leagueFit = clamp(0.6 + demand * 0.2, 0, 1)
  const personalizedPriority = clamp(baselineNeed / 100 + agg * 0.2, 0, 1)

  const notes: string[] = []
  if (demand > 0.7) notes.push('High waiver demand in recent sample — expect bidding wars.')
  if (demand < 0.3) notes.push('Thin bid sample — anchor to your FAAB tiers and roster need.')

  return {
    suggestedBidPercent,
    confidence,
    marketDemand,
    stashScore,
    immediateImpactScore,
    leagueFit,
    personalizedPriority,
    notes,
  }
}
