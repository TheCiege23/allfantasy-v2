/**
 * MetaSnapshotGenerator – produces GlobalMetaSnapshot records per sport/season/week and meta type.
 * Uses TrendDetectionService and existing PlayerMetaTrend / StrategyMetaReport data.
 */
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { getTrendSignalsForMetaType } from './TrendDetectionService'
import { normalizeSportForMeta } from './SportMetaResolver'
import type { MetaType, TimeframeId } from './types'
import { META_TYPES } from './types'
import { SUPPORTED_SPORTS } from '@/lib/sport-scope'
import { resolveSinceFromWeekOrTimeframe } from './timeframe'

export interface GenerateSnapshotInput {
  sport: string
  season: string
  weekOrPeriod?: number
  metaTypes?: MetaType[]
  timeframe?: TimeframeId
}

export async function generateGlobalMetaSnapshots(input: GenerateSnapshotInput): Promise<number> {
  const sport = normalizeSportForMeta(input.sport)
  const season = String(input.season)
  const weekOrPeriod = input.weekOrPeriod ?? 0
  const metaTypes = input.metaTypes ?? [...META_TYPES]
  const since = resolveSinceFromWeekOrTimeframe({
    weekOrPeriod,
    timeframe: input.timeframe,
  })
  let touched = 0

  await syncPositionMetaTrends(sport, since)
  await syncStrategyMetaSnapshots(sport, since)

  for (const metaType of metaTypes) {
    const trendData = await getTrendSignalsForMetaType(metaType, {
      sport,
      season,
      weekOrPeriod,
      timeframe: input.timeframe,
    })
    const data = {
      ...trendData,
      generatedAt: new Date().toISOString(),
      sport,
      season,
      weekOrPeriod,
      timeframe: input.timeframe ?? null,
    }
    await prisma.globalMetaSnapshot.upsert({
      where: {
        uniq_global_meta_snapshot_scope: {
          sport,
          season,
          weekOrPeriod,
          metaType,
        },
      },
      create: {
        sport,
        season,
        weekOrPeriod,
        metaType,
        data,
      },
      update: {
        data,
      },
    })
    touched++
  }
  return touched
}

/** Generate snapshots for all supported sports and current season. */
export async function generateAllSportSnapshots(season?: string): Promise<number> {
  const year = season ?? String(new Date().getFullYear())
  let total = 0
  for (const sport of SUPPORTED_SPORTS) {
    total += await generateGlobalMetaSnapshots({ sport, season: year })
  }
  return total
}

function resolveTrendDirection(averageTrendScore: number): string {
  if (averageTrendScore >= 70) return 'Rising'
  if (averageTrendScore <= 40) return 'Falling'
  return 'Stable'
}

async function syncPositionMetaTrends(sport: string, since?: Date): Promise<number> {
  const playerRows = await prisma.playerMetaTrend.findMany({
    where: {
      sport,
      ...(since ? { updatedAt: { gte: since } } : {}),
    },
    select: {
      playerId: true,
      addRate: true,
      draftFrequency: true,
      lineupStartRate: true,
      trendScore: true,
    },
    take: 5_000,
  })
  if (playerRows.length === 0) return 0

  const players = await prisma.player.findMany({
    where: {
      id: { in: playerRows.map((row) => row.playerId) },
      sport,
    },
    select: {
      id: true,
      position: true,
    },
  })
  const positionByPlayerId = new Map(players.map((player) => [player.id, player.position?.toUpperCase().trim() ?? 'UNK']))

  const buckets = new Map<
    string,
    {
      usageRate: number
      draftRate: number
      rosterRate: number
      trendScore: number
      sampleSize: number
    }
  >()
  for (const row of playerRows) {
    const position = positionByPlayerId.get(row.playerId)
    if (!position) continue
    const current = buckets.get(position) ?? {
      usageRate: 0,
      draftRate: 0,
      rosterRate: 0,
      trendScore: 0,
      sampleSize: 0,
    }
    current.usageRate += row.lineupStartRate
    current.draftRate += row.draftFrequency
    current.rosterRate += row.addRate
    current.trendScore += row.trendScore
    current.sampleSize += 1
    buckets.set(position, current)
  }

  let touched = 0
  for (const [position, bucket] of buckets.entries()) {
    if (!bucket.sampleSize) continue
    const usageRate = bucket.usageRate / bucket.sampleSize
    const draftRate = bucket.draftRate / bucket.sampleSize
    const rosterRate = bucket.rosterRate / bucket.sampleSize
    const avgTrendScore = bucket.trendScore / bucket.sampleSize
    await prisma.positionMetaTrend.upsert({
      where: {
        uniq_position_meta_trend_position_sport: {
          position,
          sport,
        },
      },
      create: {
        position,
        sport,
        usageRate,
        draftRate,
        rosterRate,
        trendingDirection: resolveTrendDirection(avgTrendScore),
      },
      update: {
        usageRate,
        draftRate,
        rosterRate,
        trendingDirection: resolveTrendDirection(avgTrendScore),
      },
    })
    touched += 1
  }
  return touched
}

async function syncStrategyMetaSnapshots(sport: string, since?: Date): Promise<number> {
  const sourceRows = await prisma.strategyMetaReport.findMany({
    where: {
      sport,
      ...(since ? { updatedAt: { gte: since } } : {}),
    },
    orderBy: { updatedAt: 'desc' },
    take: 200,
  })
  if (sourceRows.length === 0) return 0

  try {
    const rows = sourceRows.map((row) => ({
      strategyType: row.strategyType,
      sport: row.sport,
      usageRate: row.usageRate,
      successRate: row.successRate,
      trendingDirection: row.trendingDirection,
      createdAt: row.updatedAt,
    }))
    await prisma.strategyMetaSnapshot.createMany({
      data: rows,
    })
    return rows.length
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2021'
    ) {
      return 0
    }
    throw error
  }
}
