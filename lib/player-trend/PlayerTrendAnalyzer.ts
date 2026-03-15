/**
 * Player Trend Analyzer: query trending players (hottest, rising, fallers) for AI and dashboard.
 */
import { prisma } from '@/lib/prisma'
import type { TrendDirection } from './types'

export const SUPPORTED_SPORTS = ['NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB', 'SOCCER'] as const

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
  limit?: number
  minScore?: number
}

/**
 * Get hottest players (highest trend score, optionally by sport).
 */
export async function getHottestPlayers(options: TrendingListOptions = {}): Promise<TrendingPlayerRow[]> {
  const { sport, limit = 50, minScore = 0 } = options
  const rows = await prisma.playerMetaTrend.findMany({
    where: {
      ...(sport && { sport }),
      trendScore: { gte: minScore },
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
  const { sport, limit = 50 } = options
  const rows = await prisma.playerMetaTrend.findMany({
    where: {
      trendingDirection: { in: ['Rising', 'Hot'] },
      ...(sport && { sport }),
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
  const { sport, limit = 50 } = options
  const rows = await prisma.playerMetaTrend.findMany({
    where: {
      trendingDirection: { in: ['Falling', 'Cold'] },
      ...(sport && { sport }),
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
  const { sport, limit = 50 } = options
  const rows = await prisma.playerMetaTrend.findMany({
    where: {
      trendingDirection: direction,
      ...(sport && { sport }),
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
