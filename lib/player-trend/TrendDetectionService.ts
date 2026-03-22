/**
 * Player Trend Detection Engine (PROMPT 135).
 * Detects hot_streak, cold_streak, breakout_candidate, sell_high_candidate
 * with deterministic signals: performance delta, usage change, minutes/snap share, efficiency.
 * Supports NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER via sport-scope.
 */
import { SUPPORTED_SPORTS } from '@/lib/sport-scope'
import { getTrendingByDirection } from './PlayerTrendAnalyzer'
import type { TrendingPlayerRow } from './PlayerTrendAnalyzer'
import type { TrendFeedType, TrendDeterministicSignals } from './types'
import { prisma } from '@/lib/prisma'
import type { TimeframeId } from '@/lib/global-meta-engine/types'

export type { TrendFeedType, TrendDeterministicSignals }

export interface TrendFeedItem {
  trendType: TrendFeedType
  playerId: string
  sport: string
  displayName: string | null
  signals: TrendDeterministicSignals
  trendScore: number
  /** Underlying direction (Hot, Rising, Falling, Cold) */
  direction: string
  updatedAt: string
}

export interface TrendFeedOptions {
  sport?: string
  timeframe?: TimeframeId
  limitPerType?: number
  /** Max items total across all types (default 80) */
  limit?: number
}

/**
 * Build deterministic signals from a trending row and optional previous score.
 */
function buildSignals(
  row: TrendingPlayerRow,
  previousTrendScore: number | null
): TrendDeterministicSignals {
  const performanceDelta =
    previousTrendScore != null && Number.isFinite(previousTrendScore)
      ? row.trendScore - previousTrendScore
      : null
  return {
    performanceDelta,
    usageChange: row.addRate - row.dropRate,
    minutesOrSnapShare: row.lineupStartRate,
    efficiencyScore: row.trendScore,
  }
}

/**
 * Classify a Hot row as sell_high_candidate when trade interest is high relative to add rate.
 */
function isSellHighCandidate(row: TrendingPlayerRow): boolean {
  const tradeThreshold = 0.15
  return row.trendingDirection === 'Hot' && row.tradeInterest >= tradeThreshold
}

/**
 * Resolve display names for player IDs in bulk (single query per sport batch).
 */
async function resolveDisplayNames(
  playerIds: string[],
  sport: string
): Promise<Map<string, string | null>> {
  if (playerIds.length === 0) return new Map()
  const uniq = [...new Set(playerIds)]
  const players = await prisma.player.findMany({
    where: { id: { in: uniq }, sport },
    select: { id: true, name: true },
  })
  const map = new Map<string, string | null>()
  for (const p of players) map.set(p.id, p.name ?? null)
  return map
}

/**
 * Get previous trend scores for a set of player/sport pairs.
 */
async function getPreviousScores(
  rows: TrendingPlayerRow[]
): Promise<Map<string, number | null>> {
  if (rows.length === 0) return new Map()
  const keys = rows.map((r) => ({ playerId: r.playerId, sport: r.sport }))
  const recs = await prisma.playerMetaTrend.findMany({
    where: {
      OR: keys.map((k) => ({ playerId: k.playerId, sport: k.sport })),
    },
    select: { playerId: true, sport: true, previousTrendScore: true },
  })
  const map = new Map<string, number | null>()
  for (const r of recs) {
    map.set(`${r.playerId}:${r.sport}`, r.previousTrendScore)
  }
  return map
}

/**
 * Build feed items from rows, assign trendType, attach signals and display names.
 */
async function toFeedItems(
  rows: TrendingPlayerRow[],
  trendType: TrendFeedType,
  nameMap: Map<string, string | null>,
  prevScoreMap: Map<string, number | null>
): Promise<TrendFeedItem[]> {
  const items: TrendFeedItem[] = []
  for (const row of rows) {
    const prev = prevScoreMap.get(`${row.playerId}:${row.sport}`) ?? null
    items.push({
      trendType,
      playerId: row.playerId,
      sport: row.sport,
      displayName: nameMap.get(row.playerId) ?? null,
      signals: buildSignals(row, prev),
      trendScore: row.trendScore,
      direction: row.trendingDirection,
      updatedAt: row.updatedAt.toISOString(),
    })
  }
  return items
}

/**
 * Fetch full trend feed: hot_streak, cold_streak, breakout_candidate, sell_high_candidate
 * with deterministic signals and display names. Sport filter uses sport-scope.
 */
export async function getTrendFeed(
  options: TrendFeedOptions = {}
): Promise<TrendFeedItem[]> {
  const {
    sport,
    timeframe,
    limitPerType = 25,
    limit = 80,
  } = options

  const sportFilter = sport && (SUPPORTED_SPORTS as readonly string[]).includes(sport) ? sport : undefined
  const opts = { sport: sportFilter, timeframe, limit: limitPerType }

  const [hotRows, risingRows, fallingRows, coldRows] = await Promise.all([
    getTrendingByDirection('Hot', opts),
    getTrendingByDirection('Rising', opts),
    getTrendingByDirection('Falling', opts),
    getTrendingByDirection('Cold', opts),
  ])

  const allRows: TrendingPlayerRow[] = [
    ...hotRows,
    ...risingRows,
    ...fallingRows,
    ...coldRows,
  ]
  const playerIdsBySport = new Map<string, string[]>()
  for (const r of allRows) {
    const list = playerIdsBySport.get(r.sport) ?? []
    list.push(r.playerId)
    playerIdsBySport.set(r.sport, list)
  }
  const nameMaps = await Promise.all(
    [...playerIdsBySport.entries()].map(([s, ids]) => resolveDisplayNames(ids, s))
  )
  const nameMap = new Map<string, string | null>()
  for (const m of nameMaps) {
    for (const [id, name] of m) nameMap.set(id, name)
  }
  const prevScoreMap = await getPreviousScores(allRows)

  const hotStreak: TrendFeedItem[] = await toFeedItems(
    hotRows.filter((r) => !isSellHighCandidate(r)),
    'hot_streak',
    nameMap,
    prevScoreMap
  )
  const sellHigh: TrendFeedItem[] = await toFeedItems(
    hotRows.filter(isSellHighCandidate),
    'sell_high_candidate',
    nameMap,
    prevScoreMap
  )
  const breakout: TrendFeedItem[] = await toFeedItems(
    risingRows,
    'breakout_candidate',
    nameMap,
    prevScoreMap
  )
  const coldStreak: TrendFeedItem[] = await toFeedItems(
    [...coldRows, ...fallingRows],
    'cold_streak',
    nameMap,
    prevScoreMap
  )

  const combined = [
    ...hotStreak,
    ...sellHigh,
    ...breakout,
    ...coldStreak,
  ]
    .sort((a, b) => b.trendScore - a.trendScore)
    .slice(0, limit)

  return combined
}

/**
 * Get supported sports for the trend feed (from sport-scope).
 */
export function getTrendFeedSupportedSports(): readonly string[] {
  return SUPPORTED_SPORTS
}

/**
 * Get a single feed item for a player/sport (for AI insight endpoint).
 */
export async function getTrendFeedItemForPlayer(
  playerId: string,
  sport: string
): Promise<TrendFeedItem | null> {
  const row = await prisma.playerMetaTrend.findUnique({
    where: { uniq_player_meta_trend_player_sport: { playerId, sport } },
  })
  if (!row) return null
  const [nameMap, prevScore] = await Promise.all([
    resolveDisplayNames([playerId], sport),
    (async () => {
      const r = await prisma.playerMetaTrend.findUnique({
        where: { uniq_player_meta_trend_player_sport: { playerId, sport } },
        select: { previousTrendScore: true },
      })
      return r?.previousTrendScore ?? null
    })(),
  ])
  const displayName = nameMap.get(playerId) ?? null
  const trendingRow: TrendingPlayerRow = {
    playerId: row.playerId,
    sport: row.sport,
    trendScore: row.trendScore,
    trendingDirection: row.trendingDirection as import('./types').TrendDirection,
    addRate: row.addRate,
    dropRate: row.dropRate,
    tradeInterest: row.tradeInterest,
    draftFrequency: row.draftFrequency,
    lineupStartRate: row.lineupStartRate,
    injuryImpact: row.injuryImpact,
    updatedAt: row.updatedAt,
  }
  const trendType: TrendFeedType = isSellHighCandidate(trendingRow)
    ? 'sell_high_candidate'
    : row.trendingDirection === 'Hot'
      ? 'hot_streak'
      : row.trendingDirection === 'Rising'
        ? 'breakout_candidate'
        : (row.trendingDirection === 'Cold' || row.trendingDirection === 'Falling')
          ? 'cold_streak'
          : 'hot_streak'
  const singleNameMap = new Map<string, string | null>()
  singleNameMap.set(playerId, displayName ?? null)
  const prevMap = new Map<string, number | null>()
  prevMap.set(`${playerId}:${sport}`, prevScore)
  const [item] = await toFeedItems([trendingRow], trendType, singleNameMap, prevMap)
  return item
}
