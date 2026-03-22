/**
 * TrendDetectionService – delegates to existing PlayerMetaTrend + TrendSignalEvent and strategy meta.
 * Detects player popularity, waiver/draft/trade/roster trends, positional and strategy shifts.
 */
import { prisma } from '@/lib/prisma'
import { normalizeSportForMeta } from './SportMetaResolver'
import type { MetaType, TimeframeId } from './types'
import { resolveSeasonBounds, resolveSinceFromWeekOrTimeframe } from './timeframe'

export interface TrendDetectionInput {
  sport?: string
  season?: string
  weekOrPeriod?: number
  timeframe?: TimeframeId
}

/** Aggregate trend signals for a meta type (used by MetaSnapshotGenerator). */
export async function getTrendSignalsForMetaType(
  metaType: MetaType,
  input: TrendDetectionInput
): Promise<Record<string, unknown>> {
  const sport = input.sport ? normalizeSportForMeta(input.sport) : undefined
  const since = resolveSinceFromWeekOrTimeframe({
    weekOrPeriod: input.weekOrPeriod,
    timeframe: input.timeframe,
  })
  const seasonBounds = resolveSeasonBounds(input.season)
  const baseWhere: { sport?: string; timestamp?: { gte?: Date; lt?: Date } } = sport ? { sport } : {}
  if (since || seasonBounds.start || seasonBounds.end) {
    baseWhere.timestamp = {}
    if (since) baseWhere.timestamp.gte = since
    if (seasonBounds.start && !since) baseWhere.timestamp.gte = seasonBounds.start
    if (seasonBounds.end) baseWhere.timestamp.lt = seasonBounds.end
  }

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
      return { totalEvents: events, byPlayerCount: byPlayer.length, byPlayer, since: since?.toISOString() }
    }
    case 'DraftMeta': {
      const events = await prisma.trendSignalEvent.count({
        where: { ...baseWhere, signalType: 'draft_pick' },
      })
      return { totalEvents: events, since: since?.toISOString() }
    }
    case 'TradeMeta': {
      const events = await prisma.trendSignalEvent.count({
        where: { ...baseWhere, signalType: 'trade_request' },
      })
      return { totalEvents: events, since: since?.toISOString() }
    }
    case 'RosterMeta': {
      const events = await prisma.trendSignalEvent.count({
        where: { ...baseWhere, signalType: 'lineup_start' },
      })
      return { totalEvents: events, since: since?.toISOString() }
    }
    case 'StrategyMeta': {
      const updatedAt =
        seasonBounds.start || seasonBounds.end || since
          ? {
              ...(since ? { gte: since } : {}),
              ...(!since && seasonBounds.start ? { gte: seasonBounds.start } : {}),
              ...(seasonBounds.end ? { lt: seasonBounds.end } : {}),
            }
          : undefined
      const reports = await prisma.strategyMetaReport.findMany({
        where: {
          ...(sport ? { sport } : {}),
          ...(updatedAt ? { updatedAt } : {}),
        },
        take: 50,
      })
      return {
        strategies: reports.map((r) => ({
          strategyType: r.strategyType,
          usageRate: r.usageRate,
          successRate: r.successRate,
          trendingDirection: r.trendingDirection,
        })),
        since: since?.toISOString(),
      }
    }
    default:
      return {}
  }
}
