/**
 * Strategy Meta Engine (PROMPT 136).
 * Analyzes fantasy strategy trends across leagues.
 * Detects: draft strategy shifts, position value changes, waiver strategy trends.
 * Data sources: league data warehouse, draft logs, trade history.
 */
import { prisma } from '@/lib/prisma'
import { getStrategyMetaReports } from '@/lib/strategy-meta'
import { SUPPORTED_SPORTS } from '@/lib/sport-scope'
import type {
  MetaAnalysisResult,
  MetaAnalysisOptions,
  DraftStrategyShift,
  PositionValueChange,
  WaiverStrategyTrend,
} from './types'

const DEFAULT_WINDOW_DAYS = 30

function trendToShiftLabel(direction: string): string {
  switch (direction) {
    case 'Rising':
      return 'Usage rising'
    case 'Falling':
      return 'Usage declining'
    default:
      return 'Stable'
  }
}

/**
 * Draft strategy shifts from StrategyMetaReport (usage + success + trend).
 */
async function getDraftStrategyShifts(
  sport?: string,
  leagueFormat?: string
): Promise<DraftStrategyShift[]> {
  const rows = await getStrategyMetaReports({ sport, leagueFormat })
  return rows.map((r) => ({
    strategyType: r.strategyType,
    strategyLabel: r.strategyLabel,
    sport: r.sport,
    leagueFormat: r.leagueFormat,
    usageRate: r.usageRate,
    successRate: r.successRate,
    trendingDirection: (r.trendingDirection === 'Rising' || r.trendingDirection === 'Falling'
      ? r.trendingDirection
      : 'Stable') as 'Rising' | 'Stable' | 'Falling',
    sampleSize: r.sampleSize,
    shiftLabel: trendToShiftLabel(r.trendingDirection),
  }))
}

/**
 * Position value changes from TradeLearningInsight (and fallback LeagueTrade volume by sport).
 */
async function getPositionValueChanges(
  sport?: string,
  _windowDays?: number
): Promise<PositionValueChange[]> {
  const where: Record<string, unknown> = {}
  if (sport && (SUPPORTED_SPORTS as readonly string[]).includes(sport)) {
    where.sport = sport
  }
  const insights = await prisma.tradeLearningInsight.findMany({
    where: { ...where, position: { not: null } },
    select: {
      position: true,
      sport: true,
      sampleSize: true,
      avgValueGiven: true,
      avgValueReceived: true,
      marketTrend: true,
    },
    take: 500,
  })
  const byPos = new Map<
    string,
    { givenSum: number; receivedSum: number; n: number; trend: string | null }
  >()
  for (const i of insights) {
    const pos = i.position ?? 'UNK'
    const s = i.sport ?? 'NFL'
    const key = `${s}:${pos}`
    const n = i.sampleSize ?? 0
    const cur = byPos.get(key) ?? {
      givenSum: 0,
      receivedSum: 0,
      n: 0,
      trend: i.marketTrend ?? null,
    }
    const g = i.avgValueGiven ?? 0
    const r = i.avgValueReceived ?? 0
    cur.givenSum += g * n
    cur.receivedSum += r * n
    cur.n += n
    if (i.marketTrend) cur.trend = i.marketTrend
    byPos.set(key, cur)
  }
  return [...byPos.entries()].map(([key, agg]) => {
    const [sport, position] = key.split(':')
    const n = agg.n || 1
    return {
      position,
      sport,
      avgValueGiven: agg.n ? agg.givenSum / n : null,
      avgValueReceived: agg.n ? agg.receivedSum / n : null,
      sampleSize: agg.n,
      marketTrend: agg.trend,
      direction: agg.trend,
    }
  })
}

/**
 * Waiver strategy trends from TrendSignalEvent (waiver_add, waiver_drop) by sport.
 */
async function getWaiverStrategyTrends(
  sport?: string,
  windowDays: number = DEFAULT_WINDOW_DAYS
): Promise<WaiverStrategyTrend[]> {
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000)
  const where: Record<string, unknown> = {
    timestamp: { gte: since },
    signalType: { in: ['waiver_add', 'waiver_drop'] },
  }
  if (sport && (SUPPORTED_SPORTS as readonly string[]).includes(sport)) {
    where.sport = sport
  }
  const events = await prisma.trendSignalEvent.groupBy({
    by: ['sport', 'signalType'],
    where,
    _count: { id: true },
  })
  const bySport = new Map<string, { addCount: number; dropCount: number }>()
  for (const e of events) {
    const s = e.sport ?? 'NFL'
    const cur = bySport.get(s) ?? { addCount: 0, dropCount: 0 }
    if (e.signalType === 'waiver_add') cur.addCount += e._count.id
    else if (e.signalType === 'waiver_drop') cur.dropCount += e._count.id
    bySport.set(s, cur)
  }
  const days = Math.max(1, windowDays)
  return [...bySport.entries()].map(([s, c]) => ({
    sport: s,
    addCount: c.addCount,
    dropCount: c.dropCount,
    windowDays,
    netAdds: c.addCount - c.dropCount,
    addRatePerDay: c.addCount / days,
    dropRatePerDay: c.dropCount / days,
  }))
}

/**
 * Run full meta analysis: draft strategy shifts, position value changes, waiver strategy trends.
 */
export async function runMetaAnalysis(
  options: MetaAnalysisOptions = {}
): Promise<MetaAnalysisResult> {
  const windowDays = options.windowDays ?? DEFAULT_WINDOW_DAYS
  const [draftStrategyShifts, positionValueChanges, waiverStrategyTrends] =
    await Promise.all([
      getDraftStrategyShifts(options.sport, options.leagueFormat),
      getPositionValueChanges(options.sport, windowDays),
      getWaiverStrategyTrends(options.sport, windowDays),
    ])
  return {
    draftStrategyShifts,
    positionValueChanges,
    waiverStrategyTrends,
    sport: options.sport ?? null,
    generatedAt: new Date().toISOString(),
  }
}

/**
 * Supported sports for meta analysis (from sport-scope).
 */
export function getMetaAnalysisSupportedSports(): readonly string[] {
  return SUPPORTED_SPORTS
}
