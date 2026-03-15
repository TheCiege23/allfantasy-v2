/**
 * TrendDetectionService – delegates to existing PlayerMetaTrend + TrendSignalEvent and strategy meta.
 * Detects player popularity, waiver/draft/trade/roster trends, positional and strategy shifts.
 */
import { prisma } from '@/lib/prisma'
import { normalizeSportForMeta } from './SportMetaResolver'
import type { MetaType } from './types'

export interface TrendDetectionInput {
  sport?: string
  season?: string
  weekOrPeriod?: number
}

/** Aggregate trend signals for a meta type (used by MetaSnapshotGenerator). */
export async function getTrendSignalsForMetaType(
  metaType: MetaType,
  input: TrendDetectionInput
): Promise<Record<string, unknown>> {
  const sport = input.sport ? normalizeSportForMeta(input.sport) : undefined
  const baseWhere: { sport?: string } = sport ? { sport } : {}

  switch (metaType) {
    case 'WaiverMeta': {
      const events = await prisma.trendSignalEvent.count({
        where: {
          ...baseWhere,
          signalType: { in: ['waiver_add', 'waiver_drop'] },
        },
      })
      const byPlayer = await prisma.trendSignalEvent.groupBy({
        by: ['playerId'],
        where: { ...baseWhere, signalType: { in: ['waiver_add', 'waiver_drop'] } },
        _count: true,
      })
      return { totalEvents: events, byPlayerCount: byPlayer.length, byPlayer }
    }
    case 'DraftMeta': {
      const events = await prisma.trendSignalEvent.count({
        where: { ...baseWhere, signalType: 'draft_pick' },
      })
      return { totalEvents: events }
    }
    case 'TradeMeta': {
      const events = await prisma.trendSignalEvent.count({
        where: { ...baseWhere, signalType: 'trade_request' },
      })
      return { totalEvents: events }
    }
    case 'RosterMeta': {
      const events = await prisma.trendSignalEvent.count({
        where: { ...baseWhere, signalType: 'lineup_start' },
      })
      return { totalEvents: events }
    }
    case 'StrategyMeta': {
      const reports = await prisma.strategyMetaReport.findMany({
        where: sport ? { sport } : undefined,
        take: 50,
      })
      return {
        strategies: reports.map((r) => ({
          strategyType: r.strategyType,
          usageRate: r.usageRate,
          successRate: r.successRate,
          trendingDirection: r.trendingDirection,
        })),
      }
    }
    default:
      return {}
  }
}
