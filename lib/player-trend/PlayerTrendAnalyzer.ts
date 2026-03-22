/**
 * Player Trend Analyzer: query trending players (hottest, rising, fallers) for AI and dashboard.
 */
import { prisma } from '@/lib/prisma'
import { resolveSinceFromTimeframe } from '@/lib/global-meta-engine/timeframe'
import type { TimeframeId } from '@/lib/global-meta-engine/types'
import type { TrendDirection } from './types'
export { SUPPORTED_SPORTS } from '@/lib/sport-scope'

export interface TrendingPlayerRow {
  playerId: string
  sport: string
  trendScore: number
  trendingDirection: TrendDirection
  addRate: number
  dropRate: number
  tradeInterest: number
  draftFrequency: number
  lineupStartRate: number
  injuryImpact: number
  updatedAt: Date
}

export interface TrendingListOptions {
  sport?: string
  direction?: TrendDirection
  timeframe?: TimeframeId
  limit?: number
  minScore?: number
}

/**
 * Get hottest players (highest trend score, optionally by sport).
 */
export async function getHottestPlayers(options: TrendingListOptions = {}): Promise<TrendingPlayerRow[]> {
  const { sport, limit = 50, minScore = 0, timeframe } = options
  const since = resolveSinceFromTimeframe(timeframe)
  const rows = await prisma.playerMetaTrend.findMany({
    where: {
      ...(sport && { sport }),
      trendScore: { gte: minScore },
      ...(since ? { updatedAt: { gte: since } } : {}),
    },
    orderBy: { trendScore: 'desc' },
    take: limit,
  })
  return rows.map(toTrendingRow)
}

/**
 * Get fastest rising players (direction = Rising or Hot, ordered by score delta or score).
 */
export async function getRisingPlayers(options: TrendingListOptions = {}): Promise<TrendingPlayerRow[]> {
  const { sport, limit = 50, timeframe } = options
  const since = resolveSinceFromTimeframe(timeframe)
  const rows = await prisma.playerMetaTrend.findMany({
    where: {
      trendingDirection: { in: ['Rising', 'Hot'] },
      ...(sport && { sport }),
      ...(since ? { updatedAt: { gte: since } } : {}),
    },
    orderBy: { trendScore: 'desc' },
    take: limit,
  })
  return rows.map(toTrendingRow)
}

/**
 * Get biggest fallers (direction = Falling or Cold).
 */
export async function getFallers(options: TrendingListOptions = {}): Promise<TrendingPlayerRow[]> {
  const { sport, limit = 50, timeframe } = options
  const since = resolveSinceFromTimeframe(timeframe)
  const rows = await prisma.playerMetaTrend.findMany({
    where: {
      trendingDirection: { in: ['Falling', 'Cold'] },
      ...(sport && { sport }),
      ...(since ? { updatedAt: { gte: since } } : {}),
    },
    orderBy: { trendScore: 'asc' },
    take: limit,
  })
  return rows.map(toTrendingRow)
}

/**
 * Get trending players by direction (Rising, Hot, Stable, Falling, Cold).
 */
export async function getTrendingByDirection(
  direction: TrendDirection,
  options: Omit<TrendingListOptions, 'direction'> = {}
): Promise<TrendingPlayerRow[]> {
  const { sport, limit = 50, timeframe } = options
  const since = resolveSinceFromTimeframe(timeframe)
  const rows = await prisma.playerMetaTrend.findMany({
    where: {
      trendingDirection: direction,
      ...(sport && { sport }),
      ...(since ? { updatedAt: { gte: since } } : {}),
    },
    orderBy: direction === 'Cold' || direction === 'Falling' ? { trendScore: 'asc' } : { trendScore: 'desc' },
    take: limit,
  })
  return rows.map(toTrendingRow)
}

/**
 * Get trend for a single player/sport.
 */
export async function getPlayerTrend(
  playerId: string,
  sport: string
): Promise<TrendingPlayerRow | null> {
  const row = await prisma.playerMetaTrend.findUnique({
    where: { uniq_player_meta_trend_player_sport: { playerId, sport } },
  })
  return row ? toTrendingRow(row) : null
}

/**
 * Get players with highest trade interest (trade analyzer context).
 */
export async function getTopTradeInterest(options: TrendingListOptions = {}): Promise<TrendingPlayerRow[]> {
  const { sport, limit = 50, minScore = 0, timeframe } = options
  const since = resolveSinceFromTimeframe(timeframe)
  const rows = await prisma.playerMetaTrend.findMany({
    where: {
      ...(sport && { sport }),
      trendScore: { gte: minScore },
      tradeInterest: { gt: 0 },
      ...(since ? { updatedAt: { gte: since } } : {}),
    },
    orderBy: [{ tradeInterest: 'desc' }, { trendScore: 'desc' }],
    take: limit,
  })
  return rows.map(toTrendingRow)
}

/**
 * Get players with highest draft frequency (draft assistant context).
 */
export async function getTopDraftFrequency(options: TrendingListOptions = {}): Promise<TrendingPlayerRow[]> {
  const { sport, limit = 50, minScore = 0, timeframe } = options
  const since = resolveSinceFromTimeframe(timeframe)
  const rows = await prisma.playerMetaTrend.findMany({
    where: {
      ...(sport && { sport }),
      trendScore: { gte: minScore },
      draftFrequency: { gt: 0 },
      ...(since ? { updatedAt: { gte: since } } : {}),
    },
    orderBy: [{ draftFrequency: 'desc' }, { trendScore: 'desc' }],
    take: limit,
  })
  return rows.map(toTrendingRow)
}

function toTrendingRow(row: {
  playerId: string
  sport: string
  trendScore: number
  trendingDirection: string
  addRate: number
  dropRate: number
  tradeInterest: number
  draftFrequency: number
  lineupStartRate: number
  injuryImpact: number
  updatedAt: Date
}): TrendingPlayerRow {
  return {
    playerId: row.playerId,
    sport: row.sport,
    trendScore: row.trendScore,
    trendingDirection: row.trendingDirection as TrendDirection,
    addRate: row.addRate,
    dropRate: row.dropRate,
    tradeInterest: row.tradeInterest,
    draftFrequency: row.draftFrequency,
    lineupStartRate: row.lineupStartRate,
    injuryImpact: row.injuryImpact,
    updatedAt: row.updatedAt,
  }
}
