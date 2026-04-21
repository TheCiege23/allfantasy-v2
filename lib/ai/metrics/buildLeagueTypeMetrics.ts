/**
 * Aggregates league-archetype behavior (dynasty vs redraft, SF, TE prem, etc.)
 * from platform events. Deterministic weights in [0,1] unless noted.
 */

import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import { AI_EVENT_TYPES } from '@/lib/ai/events/aiEventTypes'

export type LeagueTypeMetricRow = {
  sport: string
  leagueType: string
  scoringProfile: string
  positionValueWeights: Record<string, number>
  rookieValueWeight: number | null
  pickValueCurve: Record<string, number>
  waiverAggressionScore: number | null
  tradeAggressionScore: number | null
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n))
}

/**
 * Rebuild rollup for (sport, leagueType, scoringProfile) from recent events.
 * V1 uses simple rates; extend with more event types over time.
 */
export async function buildLeagueTypeMetrics(params: {
  sport: string
  leagueType: string
  scoringProfile: string
}): Promise<LeagueTypeMetricRow | null> {
  const { sport, leagueType, scoringProfile } = params
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

  try {
    const events = await prisma.aiPlatformEvent.findMany({
      where: {
        sport,
        leagueType,
        scoringProfile,
        createdAt: { gte: since },
        OR: [
          { eventType: AI_EVENT_TYPES.DRAFT_PICK_MADE },
          { eventType: AI_EVENT_TYPES.TRADE_ACCEPTED },
          { eventType: AI_EVENT_TYPES.WAIVER_BID_SUBMITTED },
        ],
      },
      select: { eventType: true, payload: true },
      take: 8000,
      orderBy: { createdAt: 'desc' },
    })

    let trades = 0
    let waivers = 0
    let rookiePicks = 0
    let totalPicks = 0
    const posCounts: Record<string, number> = {}

    for (const ev of events) {
      const pl = (ev.payload ?? {}) as Record<string, unknown>
      if (ev.eventType === AI_EVENT_TYPES.TRADE_ACCEPTED) trades += 1
      if (ev.eventType === AI_EVENT_TYPES.WAIVER_BID_SUBMITTED) waivers += 1
      if (ev.eventType === AI_EVENT_TYPES.DRAFT_PICK_MADE || ev.eventType === AI_EVENT_TYPES.AUTO_PICK_MADE) {
        totalPicks += 1
        const pos = String(pl.position ?? '').toUpperCase()
        if (pos) posCounts[pos] = (posCounts[pos] ?? 0) + 1
        const isRookie = Boolean(pl.isRookie ?? pl.is_rookie)
        if (isRookie) rookiePicks += 1
      }
    }

    const posTotal = Object.values(posCounts).reduce((a, b) => a + b, 0) || 1
    const positionValueWeights: Record<string, number> = {}
    for (const [k, v] of Object.entries(posCounts)) {
      positionValueWeights[k] = clamp01(v / posTotal * 6)
    }

    const rookieValueWeight = totalPicks > 0 ? clamp01(rookiePicks / totalPicks) : null
    const waiverAggressionScore = waivers > 0 ? clamp01(Math.log1p(waivers) / 8) : null
    const tradeAggressionScore = trades > 0 ? clamp01(Math.log1p(trades) / 8) : null

    const pickValueCurve: Record<string, number> = {
      early: 1,
      mid: 0.85,
      late: 0.7,
    }

    const row: LeagueTypeMetricRow = {
      sport,
      leagueType,
      scoringProfile,
      positionValueWeights,
      rookieValueWeight,
      pickValueCurve,
      waiverAggressionScore,
      tradeAggressionScore,
    }

    await prisma.aiLeagueTypeMetric.upsert({
      where: {
        sport_leagueType_scoringProfile: { sport, leagueType, scoringProfile },
      },
      create: {
        id: randomUUID(),
        sport,
        leagueType,
        scoringProfile,
        positionValueWeights,
        rookieValueWeight,
        pickValueCurve,
        waiverAggressionScore,
        tradeAggressionScore,
      },
      update: {
        positionValueWeights,
        rookieValueWeight,
        pickValueCurve,
        waiverAggressionScore,
        tradeAggressionScore,
      },
    })

    return row
  } catch (e) {
    console.warn('[buildLeagueTypeMetrics]', e instanceof Error ? e.message : e)
    return null
  }
}
