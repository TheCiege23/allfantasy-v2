/**
 * MetaQueryService – query global meta snapshots, player/position/strategy trends.
 * Provides weekly reports, sport-specific views, platform-wide rollups, AI-consumable summaries.
 */
import { prisma } from '@/lib/prisma'
import type { MetaType, GlobalMetaSport, TimeframeId } from './types'
import { META_TYPES } from './types'
import { normalizeSportForMeta } from './SportMetaResolver'
import { resolveSinceFromTimeframe } from './timeframe'

export interface GetSnapshotsOptions {
  sport?: string
  season?: string
  weekOrPeriod?: number
  metaType?: MetaType
  timeframe?: TimeframeId
  limit?: number
}

export async function getGlobalMetaSnapshots(options: GetSnapshotsOptions = {}) {
  const { sport, season, weekOrPeriod, metaType, timeframe, limit = 50 } = options
  const since = resolveSinceFromTimeframe(timeframe)
  const rows = await prisma.globalMetaSnapshot.findMany({
    where: {
      ...(sport && { sport: normalizeSportForMeta(sport) }),
      ...(season && { season }),
      ...(weekOrPeriod != null && { weekOrPeriod }),
      ...(metaType && { metaType }),
      ...(since ? { createdAt: { gte: since } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
  return rows
}

export interface GetPlayerTrendsOptions {
  sport?: string
  direction?: string
  timeframe?: TimeframeId
  limit?: number
}

export async function getPlayerMetaTrendsForMeta(options: GetPlayerTrendsOptions = {}) {
  const { sport, direction, timeframe, limit = 100 } = options
  const since = resolveSinceFromTimeframe(timeframe)
  const rows = await prisma.playerMetaTrend.findMany({
    where: {
      ...(sport && { sport: normalizeSportForMeta(sport) }),
      ...(direction && { trendingDirection: direction }),
      ...(since ? { updatedAt: { gte: since } } : {}),
    },
    orderBy: { trendScore: 'desc' },
    take: limit,
  })
  return rows.map((r) => ({
    playerId: r.playerId,
    sport: r.sport,
    trendScore: r.trendScore,
    addRate: r.addRate,
    dropRate: r.dropRate,
    tradeRate: r.tradeInterest,
    draftRate: r.draftFrequency,
    trendingDirection: r.trendingDirection,
    updatedAt: r.updatedAt,
  }))
}

export async function getPositionMetaTrends(sport?: string, timeframe?: TimeframeId) {
  const since = resolveSinceFromTimeframe(timeframe)
  const rows = await prisma.positionMetaTrend.findMany({
    where: {
      ...(sport ? { sport: normalizeSportForMeta(sport) } : {}),
      ...(since ? { updatedAt: { gte: since } } : {}),
    },
    orderBy: { usageRate: 'desc' },
  })
  return rows
}

export async function getStrategyMetaForEngine(sport?: string, leagueFormat?: string, timeframe?: TimeframeId) {
  const since = resolveSinceFromTimeframe(timeframe)
  const rows = await prisma.strategyMetaReport.findMany({
    where: {
      ...(sport && { sport: normalizeSportForMeta(sport) }),
      ...(leagueFormat && { leagueFormat }),
      ...(since ? { updatedAt: { gte: since } } : {}),
    },
    orderBy: { usageRate: 'desc' },
  })
  return rows.map((r) => ({
    strategyType: r.strategyType,
    sport: r.sport,
    usageRate: r.usageRate,
    successRate: r.successRate,
    trendingDirection: r.trendingDirection,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }))
}

export async function getLatestSnapshotPerMetaType(sport: GlobalMetaSport, season: string) {
  const results: Record<string, unknown> = {}
  for (const metaType of META_TYPES) {
    const snap = await prisma.globalMetaSnapshot.findFirst({
      where: { sport, season, metaType },
      orderBy: { createdAt: 'desc' },
    })
    if (snap) results[metaType] = snap.data as Record<string, unknown>
  }
  return results
}
