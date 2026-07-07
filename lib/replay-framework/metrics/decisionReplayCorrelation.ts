/**
 * Decision OS Replay Framework Phase 15 — Decision Replay Correlation.
 * Read-only: joins the ALREADY-INGESTED Trade Replay and Lineup Replay
 * corpora for leagues that appear in both, using each real, stable
 * `providerAssetId` (Phase 9's trade fix; Phase 13's lineup convention) to
 * track a specific real acquired player from the moment of a real trade
 * into their real, subsequent lineup history on the receiving roster.
 *
 * No new ingestion. No production engine call. No writes at all (every
 * function here is a pure `findMany` + in-memory join). Per
 * docs/SLEEPER_TRADE_REPLAY_ARCHITECTURE_ADR.md §6 (isolation, unchanged
 * since Phase 3): never touches TradeOfferEvent/TradeOutcomeEvent/
 * TradeLearningStats.
 *
 * Known, disclosed approximation: `ReplayImport.providerWeek` is `null` for
 * every trade row (per `sleeperTradeNormalizer.ts`'s own documented design
 * — "the same trade can appear in multiple week buckets during backfill").
 * A trade's approximate week is instead derived from its real `resolvedAt`
 * timestamp, using the exact same season-start approximation
 * `lineupSleeperNormalizer.ts` already uses in the other direction
 * (`Date.UTC(season, 8, 1) + week * 7 days`), inverted. This is an honest
 * approximation, not an exact week number, and is documented as such
 * everywhere it's used.
 */
import { prisma } from '@/lib/prisma'
import type { LineupBacktestOutput, LineupReplayPayload, TradeBacktestOutput, TradeReplayPayload } from '../types'
import { average } from './shared'

/** Inverts `lineupSleeperNormalizer.ts`'s `approximateWeekDate()` — same convention, same disclosed imprecision. */
function approximateWeekFromDate(season: number, date: Date): number {
  const seasonStart = Date.UTC(season, 8, 1)
  const weeks = (date.getTime() - seasonStart) / (7 * 24 * 60 * 60 * 1000)
  return Math.max(1, Math.min(18, Math.round(weeks)))
}

interface TradeRow {
  id: string
  providerLeagueId: string
  season: number
  resolvedAt: Date | null
  participantsInvolved: number[]
  payload: TradeReplayPayload
  backtestedOutput: TradeBacktestOutput
}

interface LineupRow {
  providerLeagueId: string
  season: number
  providerWeek: number | null
  rosterId: number
  payload: LineupReplayPayload
  backtestedOutput: LineupBacktestOutput
}

export interface AcquiredPlayerImpact {
  providerAssetId: string
  name: string
  lineupAppearances: number
  starterAppearances: number
  optimalAppearances: number
  wastedOptimalAppearances: number
  totalPointsContributed: number
  totalPointsWhileStarted: number
}

export interface TradeReplayLineupImpact {
  tradeReplayId: string
  providerLeagueId: string
  season: number
  approximateTradeWeek: number | null
  verdict: string
  acceptProb: number
  confidenceScore: number
  receivingRosterId: number
  givenUpValue: number
  acquiredPlayers: AcquiredPlayerImpact[]
  lineupAppearances: number
  starterAppearances: number
  optimalAppearances: number
  wastedOptimalAppearances: number
  totalPointsContributed: number
  totalPointsWhileStarted: number
  starterConversionRate: number | null
  benchConversionRate: number | null
  tradeROI: number | null
  lineupROI: number | null
}

export interface DecisionReplayCorrelationSummary {
  totalTradesConsidered: number
  totalTradesWithLineupData: number
  perTradeImpacts: TradeReplayLineupImpact[]
  avgStarterConversionRate: number | null
  avgBenchConversionRate: number | null
  avgTradeROI: number | null
  avgLineupROI: number | null
  avgTotalPointsContributed: number | null
  byVerdict: Array<{ verdict: string; count: number; avgTradeROI: number | null; avgStarterConversionRate: number | null; avgTotalPointsContributed: number | null }>
  byConfidenceTier: Array<{ tier: 'high' | 'low'; threshold: number; count: number; avgTradeROI: number | null; avgStarterConversionRate: number | null; avgTotalPointsContributed: number | null }>
  /** Roster-level "did the whole roster's real lineup-setting improve after this trade" — aggregated across all trades with data on both sides. */
  lineupImprovementScore: {
    avgEfficiencyBeforeTrade: number | null
    avgEfficiencyAfterTrade: number | null
    sampleSizeBefore: number
    sampleSizeAfter: number
  }
}

function isOptimal(providerAssetId: string, bt: LineupBacktestOutput, wasActualStarter: boolean): boolean {
  const isSuboptimalStarter = bt.subOptimalActualStarters.some((m) => m.providerAssetId === providerAssetId)
  if (wasActualStarter) return !isSuboptimalStarter
  return bt.missedOptimalStarters.some((m) => m.providerAssetId === providerAssetId)
}

function isWastedOptimal(providerAssetId: string, bt: LineupBacktestOutput): boolean {
  return bt.missedOptimalStarters.some((m) => m.providerAssetId === providerAssetId)
}

/**
 * Correlates the real Trade Replay and Lineup Replay corpora for the given
 * leagues (must appear in both decisionTypes to produce any impact rows).
 * Read-only: two pairs of `findMany` calls (trade + lineup, each
 * import+backtest), zero writes.
 */
export async function computeDecisionReplayCorrelation(providerLeagueIds: string[]): Promise<DecisionReplayCorrelationSummary> {
  const leagueFilter = { providerLeagueId: { in: providerLeagueIds } }

  const [tradeReplays, tradeBacktests, lineupReplaysWithId, lineupBacktests] = await Promise.all([
    prisma.replayImport.findMany({
      where: { decisionType: 'trade', ...leagueFilter },
      select: { id: true, providerLeagueId: true, season: true, resolvedAt: true, participantsInvolved: true, payload: true },
    }),
    prisma.replayBacktestResult.findMany({
      where: { decisionType: 'trade', replay: { ...leagueFilter } },
      select: { replayId: true, backtestedOutput: true },
    }),
    prisma.replayImport.findMany({
      where: { decisionType: 'lineup', ...leagueFilter },
      select: { id: true, providerLeagueId: true, season: true, providerWeek: true, participantsInvolved: true, payload: true },
    }),
    prisma.replayBacktestResult.findMany({
      where: { decisionType: 'lineup', replay: { ...leagueFilter } },
      select: { replayId: true, backtestedOutput: true },
    }),
  ])

  const tradeBacktestByReplayId = new Map(tradeBacktests.map((bt) => [bt.replayId, bt.backtestedOutput as unknown as TradeBacktestOutput]))
  const trades: TradeRow[] = tradeReplays
    .map((r) => {
      const bt = tradeBacktestByReplayId.get(r.id)
      if (!bt) return null
      return {
        id: r.id,
        providerLeagueId: r.providerLeagueId,
        season: r.season,
        resolvedAt: r.resolvedAt,
        participantsInvolved: r.participantsInvolved as unknown as number[],
        payload: r.payload as unknown as TradeReplayPayload,
        backtestedOutput: bt,
      }
    })
    .filter((t): t is TradeRow => t !== null)

  const lineupBacktestByReplayId = new Map(lineupBacktests.map((bt) => [bt.replayId, bt.backtestedOutput as unknown as LineupBacktestOutput]))
  const lineups: LineupRow[] = lineupReplaysWithId
    .map((r) => {
      const bt = lineupBacktestByReplayId.get(r.id)
      if (!bt) return null
      const participants = r.participantsInvolved as unknown as number[]
      return {
        providerLeagueId: r.providerLeagueId,
        season: r.season,
        providerWeek: r.providerWeek,
        rosterId: participants[0],
        payload: r.payload as unknown as LineupReplayPayload,
        backtestedOutput: bt,
      }
    })
    .filter((l): l is LineupRow => l !== null)

  // Index lineup rows by (league, season, rosterId) for fast lookup.
  const lineupsByRoster = new Map<string, LineupRow[]>()
  for (const l of lineups) {
    const key = `${l.providerLeagueId}::${l.season}::${l.rosterId}`
    const list = lineupsByRoster.get(key) ?? []
    list.push(l)
    lineupsByRoster.set(key, list)
  }

  const perTradeImpacts: TradeReplayLineupImpact[] = []

  for (const trade of trades) {
    if (!trade.resolvedAt || trade.participantsInvolved.length < 1) continue
    const receivingRosterId = trade.participantsInvolved[0] // proposerRosterId receives assetsReceived, per sleeperTradeNormalizer.ts
    const acquired = trade.payload.assetsReceived.filter((a) => a.providerAssetId)
    if (acquired.length === 0) continue

    const approxWeek = approximateWeekFromDate(trade.season, trade.resolvedAt)
    const key = `${trade.providerLeagueId}::${trade.season}::${receivingRosterId}`
    const rosterLineups = (lineupsByRoster.get(key) ?? []).filter((l) => (l.providerWeek ?? 0) >= approxWeek)

    const acquiredPlayers: AcquiredPlayerImpact[] = acquired.map((asset) => {
      const providerAssetId = asset.providerAssetId!
      let lineupAppearances = 0
      let starterAppearances = 0
      let optimalAppearances = 0
      let wastedOptimalAppearances = 0
      let totalPointsContributed = 0
      let totalPointsWhileStarted = 0

      for (const l of rosterLineups) {
        const rosterEntry = l.payload.fullRoster.find((p) => p.providerAssetId === providerAssetId)
        if (!rosterEntry) continue
        lineupAppearances++
        totalPointsContributed += rosterEntry.actualPoints
        const wasStarter = l.payload.actualStarterIds.includes(providerAssetId)
        if (wasStarter) {
          starterAppearances++
          totalPointsWhileStarted += rosterEntry.actualPoints
        }
        if (isOptimal(providerAssetId, l.backtestedOutput, wasStarter)) optimalAppearances++
        if (isWastedOptimal(providerAssetId, l.backtestedOutput)) wastedOptimalAppearances++
      }

      return {
        providerAssetId,
        name: asset.name,
        lineupAppearances,
        starterAppearances,
        optimalAppearances,
        wastedOptimalAppearances,
        totalPointsContributed: Math.round(totalPointsContributed * 100) / 100,
        totalPointsWhileStarted: Math.round(totalPointsWhileStarted * 100) / 100,
      }
    })

    const lineupAppearances = acquiredPlayers.reduce((s, p) => s + p.lineupAppearances, 0)
    const starterAppearances = acquiredPlayers.reduce((s, p) => s + p.starterAppearances, 0)
    const optimalAppearances = acquiredPlayers.reduce((s, p) => s + p.optimalAppearances, 0)
    const wastedOptimalAppearances = acquiredPlayers.reduce((s, p) => s + p.wastedOptimalAppearances, 0)
    const totalPointsContributed = Math.round(acquiredPlayers.reduce((s, p) => s + p.totalPointsContributed, 0) * 100) / 100
    const totalPointsWhileStarted = Math.round(acquiredPlayers.reduce((s, p) => s + p.totalPointsWhileStarted, 0) * 100) / 100
    const givenUpValue = trade.payload.assetsGiven.reduce((s, a) => s + a.value, 0)

    perTradeImpacts.push({
      tradeReplayId: trade.id,
      providerLeagueId: trade.providerLeagueId,
      season: trade.season,
      approximateTradeWeek: approxWeek,
      verdict: trade.backtestedOutput.verdict,
      acceptProb: trade.backtestedOutput.acceptProb,
      confidenceScore: trade.backtestedOutput.confidenceScore,
      receivingRosterId,
      givenUpValue,
      acquiredPlayers,
      lineupAppearances,
      starterAppearances,
      optimalAppearances,
      wastedOptimalAppearances,
      totalPointsContributed,
      totalPointsWhileStarted,
      starterConversionRate: lineupAppearances > 0 ? starterAppearances / lineupAppearances : null,
      benchConversionRate: optimalAppearances > 0 ? wastedOptimalAppearances / optimalAppearances : null,
      tradeROI: givenUpValue > 0 ? Math.round((totalPointsWhileStarted / givenUpValue) * 10000) / 10000 : null,
      lineupROI: totalPointsContributed > 0 ? Math.round((totalPointsWhileStarted / totalPointsContributed) * 1000) / 1000 : null,
    })
  }

  const withLineupData = perTradeImpacts.filter((t) => t.lineupAppearances > 0)

  const byVerdictMap = new Map<string, TradeReplayLineupImpact[]>()
  for (const t of withLineupData) {
    const list = byVerdictMap.get(t.verdict) ?? []
    list.push(t)
    byVerdictMap.set(t.verdict, list)
  }
  const byVerdict = Array.from(byVerdictMap.entries()).map(([verdict, group]) => ({
    verdict,
    count: group.length,
    avgTradeROI: average(group.map((t) => t.tradeROI).filter((v): v is number => v !== null)),
    avgStarterConversionRate: average(group.map((t) => t.starterConversionRate).filter((v): v is number => v !== null)),
    avgTotalPointsContributed: average(group.map((t) => t.totalPointsContributed)),
  }))

  const confidenceValues = withLineupData.map((t) => t.confidenceScore).sort((a, b) => a - b)
  const medianConfidence = confidenceValues.length > 0
    ? confidenceValues[Math.floor(confidenceValues.length / 2)]
    : 0
  const highTier = withLineupData.filter((t) => t.confidenceScore >= medianConfidence)
  const lowTier = withLineupData.filter((t) => t.confidenceScore < medianConfidence)
  const byConfidenceTier: DecisionReplayCorrelationSummary['byConfidenceTier'] = [
    {
      tier: 'high',
      threshold: medianConfidence,
      count: highTier.length,
      avgTradeROI: average(highTier.map((t) => t.tradeROI).filter((v): v is number => v !== null)),
      avgStarterConversionRate: average(highTier.map((t) => t.starterConversionRate).filter((v): v is number => v !== null)),
      avgTotalPointsContributed: average(highTier.map((t) => t.totalPointsContributed)),
    },
    {
      tier: 'low',
      threshold: medianConfidence,
      count: lowTier.length,
      avgTradeROI: average(lowTier.map((t) => t.tradeROI).filter((v): v is number => v !== null)),
      avgStarterConversionRate: average(lowTier.map((t) => t.starterConversionRate).filter((v): v is number => v !== null)),
      avgTotalPointsContributed: average(lowTier.map((t) => t.totalPointsContributed)),
    },
  ]

  // Roster-level lineup-improvement score: for every (league, season, roster)
  // that had at least one real trade, compare avg efficiencyPct in the real
  // lineup rows before vs. after that roster's earliest real trade.
  const beforeEfficiencies: number[] = []
  const afterEfficiencies: number[] = []
  const rostersWithTrades = new Map<string, number>() // key -> earliest approx trade week
  for (const t of perTradeImpacts) {
    const key = `${t.providerLeagueId}::${t.season}::${t.receivingRosterId}`
    const existing = rostersWithTrades.get(key)
    if (existing === undefined || (t.approximateTradeWeek ?? 99) < existing) {
      rostersWithTrades.set(key, t.approximateTradeWeek ?? 99)
    }
  }
  for (const [key, earliestWeek] of rostersWithTrades.entries()) {
    const rosterLineups = lineupsByRoster.get(key) ?? []
    for (const l of rosterLineups) {
      if (l.providerWeek == null) continue
      if (l.providerWeek < earliestWeek) beforeEfficiencies.push(l.backtestedOutput.efficiencyPct)
      else afterEfficiencies.push(l.backtestedOutput.efficiencyPct)
    }
  }

  return {
    totalTradesConsidered: perTradeImpacts.length,
    totalTradesWithLineupData: withLineupData.length,
    perTradeImpacts,
    avgStarterConversionRate: average(withLineupData.map((t) => t.starterConversionRate).filter((v): v is number => v !== null)),
    avgBenchConversionRate: average(withLineupData.map((t) => t.benchConversionRate).filter((v): v is number => v !== null)),
    avgTradeROI: average(withLineupData.map((t) => t.tradeROI).filter((v): v is number => v !== null)),
    avgLineupROI: average(withLineupData.map((t) => t.lineupROI).filter((v): v is number => v !== null)),
    avgTotalPointsContributed: average(withLineupData.map((t) => t.totalPointsContributed)),
    byVerdict,
    byConfidenceTier,
    lineupImprovementScore: {
      avgEfficiencyBeforeTrade: average(beforeEfficiencies),
      avgEfficiencyAfterTrade: average(afterEfficiencies),
      sampleSizeBefore: beforeEfficiencies.length,
      sampleSizeAfter: afterEfficiencies.length,
    },
  }
}
