/**
 * MetaQueryService – query global meta snapshots, player/position/strategy trends.
 * Provides weekly reports, sport-specific views, platform-wide rollups, AI-consumable summaries.
 */
import { prisma } from '@/lib/prisma'
import type { MetaType, GlobalMetaSport } from './types'
import { META_TYPES } from './types'
import { normalizeSportForMeta } from './SportMetaResolver'

export interface GetSnapshotsOptions {
  sport?: string
  season?: string
  weekOrPeriod?: number
  metaType?: MetaType
  limit?: number
}

export async function getGlobalMetaSnapshots(options: GetSnapshotsOptions = {}) {
  const { sport, season, weekOrPeriod, metaType, limit = 50 } = options
  const rows = await prisma.globalMetaSnapshot.findMany({
    where: {
      ...(sport && { sport: normalizeSportForMeta(sport) }),
      ...(season && { season }),
      ...(weekOrPeriod != null && { weekOrPeriod }),
      ...(metaType && { metaType }),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
  return rows
}

export interface GetPlayerTrendsOptions {
  sport?: string
  direction?: string
  limit?: number
}

export async function getPlayerMetaTrendsForMeta(options: GetPlayerTrendsOptions = {}) {
  const { sport, direction, limit = 100 } = options
  const rows = await prisma.playerMetaTrend.findMany({
    where: {
      ...(sport && { sport: normalizeSportForMeta(sport) }),
      ...(direction && { trendingDirection: direction }),
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

export async function getPositionMetaTrends(sport?: string) {
  const rows = await prisma.positionMetaTrend.findMany({
    where: sport ? { sport: normalizeSportForMeta(sport) } : undefined,
    orderBy: { usageRate: 'desc' },
  })
  return rows
}

export async function getStrategyMetaForEngine(sport?: string, leagueFormat?: string) {
  const rows = await prisma.strategyMetaReport.findMany({
    where: {
      ...(sport && { sport: normalizeSportForMeta(sport) }),
      ...(leagueFormat && { leagueFormat }),
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
