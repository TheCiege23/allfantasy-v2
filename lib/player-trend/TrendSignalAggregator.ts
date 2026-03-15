/**
 * Aggregates raw TrendSignalEvent rows into normalized rates for a player/sport.
 * Rates are normalized by time window and platform activity level (optional).
 */
import { prisma } from '@/lib/prisma'
import { TREND_WINDOW_MS } from './types'
import type { TrendSignals } from './types'
import type { TrendSignalType } from './types'

const SIGNAL_TO_SIGNAL_KEY: Record<TrendSignalType, keyof TrendSignals | null> = {
  waiver_add: 'addRate',
  waiver_drop: 'dropRate',
  trade_request: 'tradeInterest',
  draft_pick: 'draftFrequency',
  lineup_start: 'lineupStartRate',
  ai_recommendation: 'addRate', // treat as add interest
  injury: 'injuryImpact',
  injury_event: 'injuryImpact',
}

/**
 * Aggregate events for one player/sport in the last TREND_WINDOW_MS into rate-like values.
 * Returns raw counts normalized by days in window so rates are comparable across sports/leagues.
 */
export async function aggregateSignalsForPlayer(
  playerId: string,
  sport: string,
  windowMs: number = TREND_WINDOW_MS
): Promise<{ signals: TrendSignals; eventCount: number }> {
  const since = new Date(Date.now() - windowMs)
  const events = await prisma.trendSignalEvent.findMany({
    where: { playerId, sport, timestamp: { gte: since } },
    orderBy: { timestamp: 'asc' },
  })

  const windowDays = Math.max(1, windowMs / (24 * 60 * 60 * 1000))
  const counts: Record<keyof TrendSignals, number> = {
    addRate: 0,
    dropRate: 0,
    tradeInterest: 0,
    draftFrequency: 0,
    lineupStartRate: 0,
    injuryImpact: 0,
  }

  for (const e of events) {
    const key = SIGNAL_TO_SIGNAL_KEY[e.signalType as TrendSignalType]
    if (key) counts[key] += e.value
  }

  const signals: TrendSignals = {
    addRate: counts.addRate / windowDays,
    dropRate: counts.dropRate / windowDays,
    tradeInterest: counts.tradeInterest / windowDays,
    draftFrequency: counts.draftFrequency / windowDays,
    lineupStartRate: Math.min(1, counts.lineupStartRate / windowDays),
    injuryImpact: counts.injuryImpact / windowDays,
  }

  return { signals, eventCount: events.length }
}

/**
 * Get previous period trend score for a player (for direction classification).
 * Uses stored previousTrendScore or re-aggregates from older window.
 */
export async function getPreviousTrendScore(
  playerId: string,
  sport: string
): Promise<number | null> {
  const row = await prisma.playerMetaTrend.findUnique({
    where: { uniq_player_meta_trend_player_sport: { playerId, sport } },
    select: { previousTrendScore: true },
  })
  return row?.previousTrendScore ?? null
}
