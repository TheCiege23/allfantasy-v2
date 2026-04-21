/**
 * Deterministic player market metrics from platform events + rollups.
 * Explainable: counts, means, simple slopes — no black-box ML.
 */

import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import { AI_EVENT_TYPES } from '@/lib/ai/events/aiEventTypes'

export type PlayerMarketMetricRow = {
  playerId: string
  sport: string
  season: number
  adpAvg: number | null
  adpTrend7d: number | null
  adpTrend30d: number | null
  draftCount: number
  waiverAddCount: number
  waiverBidAvg: number | null
  tradeInclusionCount: number
  tradeAcceptRate: number | null
  dropRate: number | null
  rosterRate: number | null
  startRate: number | null
  benchRate: number | null
  volatilityScore: number | null
}

function mean(nums: number[]): number | null {
  if (nums.length === 0) return null
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function slopeYOverX(points: { x: number; y: number }[]): number | null {
  if (points.length < 2) return null
  const n = points.length
  const mx = mean(points.map((p) => p.x)) ?? 0
  const my = mean(points.map((p) => p.y)) ?? 0
  let num = 0
  let den = 0
  for (const p of points) {
    num += (p.x - mx) * (p.y - my)
    den += (p.x - mx) ** 2
  }
  if (den === 0) return 0
  return num / den
}

/**
 * Recompute metrics for one player from recent events and upsert the rollup row.
 */
export async function buildPlayerMarketMetrics(params: {
  playerId: string
  sport: string
  season: number
}): Promise<PlayerMarketMetricRow | null> {
  const { playerId, sport, season } = params
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  try {
    const events = await prisma.aiPlatformEvent.findMany({
      where: {
        sport,
        season,
        createdAt: { gte: since30 },
        OR: [
          { eventType: AI_EVENT_TYPES.DRAFT_PICK_MADE },
          { eventType: AI_EVENT_TYPES.AUTO_PICK_MADE },
          { eventType: AI_EVENT_TYPES.PLAYER_ADDED },
          { eventType: AI_EVENT_TYPES.PLAYER_DROPPED },
          { eventType: AI_EVENT_TYPES.WAIVER_BID_SUBMITTED },
          { eventType: AI_EVENT_TYPES.TRADE_ACCEPTED },
        ],
      },
      select: { eventType: true, payload: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 4000,
    })

    const drafts: number[] = []
    const drafts7: { x: number; y: number }[] = []
    const drafts30: { x: number; y: number }[] = []
    let waiverAdds = 0
    const bids: number[] = []
    let trades = 0
    let drops = 0

    const pid = playerId.trim().toLowerCase()
    for (const ev of events) {
      const pl = (ev.payload ?? {}) as Record<string, unknown>
      const ePid = String(pl.playerId ?? pl.player_id ?? '').trim().toLowerCase()
      if (ePid && ePid !== pid) continue

      const overall = typeof pl.overallPick === 'number' ? pl.overallPick : Number(pl.overall_pick ?? NaN)
      const t = ev.createdAt.getTime()

      if (ev.eventType === AI_EVENT_TYPES.DRAFT_PICK_MADE || ev.eventType === AI_EVENT_TYPES.AUTO_PICK_MADE) {
        if (Number.isFinite(overall)) {
          drafts.push(overall)
          if (ev.createdAt >= since7) drafts7.push({ x: t, y: overall })
          drafts30.push({ x: t, y: overall })
        }
      } else if (ev.eventType === AI_EVENT_TYPES.PLAYER_ADDED) waiverAdds += 1
      else if (ev.eventType === AI_EVENT_TYPES.PLAYER_DROPPED) drops += 1
      else if (ev.eventType === AI_EVENT_TYPES.WAIVER_BID_SUBMITTED) {
        const bid = typeof pl.bidAmount === 'number' ? pl.bidAmount : Number(pl.bid ?? NaN)
        if (Number.isFinite(bid)) bids.push(bid)
      } else if (ev.eventType === AI_EVENT_TYPES.TRADE_ACCEPTED) trades += 1
    }

    const adpAvg = mean(drafts)
    const adpTrend7d = slopeYOverX(drafts7)
    const adpTrend30d = slopeYOverX(drafts30)
    const draftCount = drafts.length
    const volatilityScore =
      drafts.length >= 3 ? Math.min(100, Math.round(Math.sqrt(variance(drafts)) * 2)) : null

    const row: PlayerMarketMetricRow = {
      playerId,
      sport,
      season,
      adpAvg,
      adpTrend7d,
      adpTrend30d,
      draftCount,
      waiverAddCount: waiverAdds,
      waiverBidAvg: mean(bids),
      tradeInclusionCount: trades,
      tradeAcceptRate: trades > 0 ? 1 : null,
      dropRate: drops > 0 ? drops / Math.max(1, waiverAdds + drops) : null,
      rosterRate: null,
      startRate: null,
      benchRate: null,
      volatilityScore,
    }

    await prisma.aiPlayerMarketMetric.upsert({
      where: {
        playerId_sport_season: { playerId, sport, season },
      },
      create: {
        id: randomUUID(),
        playerId,
        sport,
        season,
        adpAvg: row.adpAvg,
        adpTrend7d: row.adpTrend7d,
        adpTrend30d: row.adpTrend30d,
        draftCount: row.draftCount,
        waiverAddCount: row.waiverAddCount,
        waiverBidAvg: row.waiverBidAvg,
        tradeInclusionCount: row.tradeInclusionCount,
        tradeAcceptRate: row.tradeAcceptRate,
        dropRate: row.dropRate,
        rosterRate: row.rosterRate,
        startRate: row.startRate,
        benchRate: row.benchRate,
        volatilityScore: row.volatilityScore,
      },
      update: {
        adpAvg: row.adpAvg,
        adpTrend7d: row.adpTrend7d,
        adpTrend30d: row.adpTrend30d,
        draftCount: row.draftCount,
        waiverAddCount: row.waiverAddCount,
        waiverBidAvg: row.waiverBidAvg,
        tradeInclusionCount: row.tradeInclusionCount,
        tradeAcceptRate: row.tradeAcceptRate,
        dropRate: row.dropRate,
        rosterRate: row.rosterRate,
        startRate: row.startRate,
        benchRate: row.benchRate,
        volatilityScore: row.volatilityScore,
      },
    })

    return row
  } catch (e) {
    console.warn('[buildPlayerMarketMetrics]', e instanceof Error ? e.message : e)
    return null
  }
}

function variance(nums: number[]): number {
  if (nums.length < 2) return 0
  const m = mean(nums) ?? 0
  return nums.reduce((s, n) => s + (n - m) ** 2, 0) / (nums.length - 1)
}
