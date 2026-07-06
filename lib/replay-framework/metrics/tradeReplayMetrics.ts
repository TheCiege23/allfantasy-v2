/**
 * Decision OS Replay Framework — read-only validation metrics over the real
 * trade replay corpus. Per docs/SLEEPER_TRADE_REPLAY_ARCHITECTURE_ADR.md §5:
 * every function here is a pure aggregate query/computation — no writes, no
 * calibration impact, no effect on any live recommendation. Bucket-histogram
 * shape mirrors the existing lib/trade-engine/calibration-metrics.ts
 * convention (10 buckets, 0–100%) rather than inventing a new one.
 */
import { prisma } from '@/lib/prisma'
import type { TradeBacktestOutput, TradeRealOutcome, TradeReplayPayload } from '../types'

export interface TradeReplayMetricsSummary {
  totalReplays: number
  totalBacktests: number
  seasons: number[]
  leagues: string[]
  avgPredictedAcceptance: number | null
  minPredictedAcceptance: number | null
  maxPredictedAcceptance: number | null
  fairnessDistribution: Record<string, number>
  valueDeltaDistribution: Array<{ bucket: string; count: number }>
  confidenceDistribution: Array<{ bucket: string; count: number }>
  acceptedTradeProbabilityDistribution: Array<{ bucket: string; count: number }>
  avgAcceptedTradeProbability: number | null
  leagueSettingsSensitivity: Array<{
    providerLeagueId: string
    season: number
    isSuperFlex: boolean | null
    isDynasty: boolean | null
    count: number
    avgPredictedAcceptance: number | null
  }>
}

interface ReplayWithBacktest {
  providerLeagueId: string
  season: number
  isSuperFlex: boolean | null
  isDynasty: boolean | null
  payload: TradeReplayPayload
  backtestedOutput: TradeBacktestOutput
  realOutcome: TradeRealOutcome | null
}

function bucketize(values: number[], scaleTo100 = false): Array<{ bucket: string; count: number }> {
  const dist: Array<{ bucket: string; count: number }> = []
  for (let i = 0; i < 10; i++) {
    const min = scaleTo100 ? i * 10 : i * 0.1
    const max = scaleTo100 ? (i + 1) * 10 : (i + 1) * 0.1
    const count = values.filter((v) => (i === 9 ? v >= min && v <= max : v >= min && v < max)).length
    const label = scaleTo100 ? `${min}–${max}` : `${Math.round(min * 100)}–${Math.round(max * 100)}%`
    dist.push({ bucket: label, count })
  }
  return dist
}

function average(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((s, v) => s + v, 0) / values.length
}

function computeValueDeltaPct(payload: TradeReplayPayload): number | null {
  const givenTotal = payload.assetsGiven.reduce((s, a) => s + a.value, 0)
  const receivedTotal = payload.assetsReceived.reduce((s, a) => s + a.value, 0)
  const total = givenTotal + receivedTotal
  if (total <= 0) return null
  return ((receivedTotal - givenTotal) / total) * 100
}

/**
 * Fetches every real `trade`-decisionType replay+backtest row currently in
 * staging and computes the full validation-metrics summary. Read-only:
 * two `findMany` calls, zero writes, no effect on `calibratedB0` or any
 * live route.
 */
export async function computeTradeReplayMetrics(): Promise<TradeReplayMetricsSummary> {
  const [replays, backtests] = await Promise.all([
    prisma.replayImport.findMany({
      where: { decisionType: 'trade' },
      select: { id: true, providerLeagueId: true, season: true, isSuperFlex: true, isDynasty: true, payload: true },
    }),
    prisma.replayBacktestResult.findMany({
      where: { decisionType: 'trade' },
      select: { replayId: true, backtestedOutput: true, realOutcome: true },
    }),
  ])

  const replayById = new Map(replays.map((r) => [r.id, r]))
  const rows: ReplayWithBacktest[] = []
  for (const bt of backtests) {
    const replay = replayById.get(bt.replayId)
    if (!replay) continue
    rows.push({
      providerLeagueId: replay.providerLeagueId,
      season: replay.season,
      isSuperFlex: replay.isSuperFlex,
      isDynasty: replay.isDynasty,
      payload: replay.payload as unknown as TradeReplayPayload,
      backtestedOutput: bt.backtestedOutput as unknown as TradeBacktestOutput,
      realOutcome: bt.realOutcome as unknown as TradeRealOutcome | null,
    })
  }

  const acceptProbs = rows.map((r) => r.backtestedOutput.acceptProb)
  const confidenceScores = rows.map((r) => r.backtestedOutput.confidenceScore)
  const valueDeltas = rows.map((r) => computeValueDeltaPct(r.payload)).filter((v): v is number => v !== null)

  const fairnessDistribution: Record<string, number> = {}
  for (const r of rows) {
    const verdict = r.backtestedOutput.verdict
    fairnessDistribution[verdict] = (fairnessDistribution[verdict] ?? 0) + 1
  }

  const acceptedRows = rows.filter((r) => r.realOutcome?.outcome === 'ACCEPTED')
  const acceptedProbs = acceptedRows.map((r) => r.backtestedOutput.acceptProb)

  const leagueGroups = new Map<string, ReplayWithBacktest[]>()
  for (const r of rows) {
    const key = `${r.providerLeagueId}::${r.season}`
    const list = leagueGroups.get(key) ?? []
    list.push(r)
    leagueGroups.set(key, list)
  }

  const leagueSettingsSensitivity = Array.from(leagueGroups.entries()).map(([key, group]) => {
    const [providerLeagueId, seasonStr] = key.split('::')
    return {
      providerLeagueId,
      season: Number(seasonStr),
      isSuperFlex: group[0]?.isSuperFlex ?? null,
      isDynasty: group[0]?.isDynasty ?? null,
      count: group.length,
      avgPredictedAcceptance: average(group.map((g) => g.backtestedOutput.acceptProb)),
    }
  })

  return {
    totalReplays: replays.length,
    totalBacktests: backtests.length,
    seasons: Array.from(new Set(replays.map((r) => r.season))).sort(),
    leagues: Array.from(new Set(replays.map((r) => r.providerLeagueId))),
    avgPredictedAcceptance: average(acceptProbs),
    minPredictedAcceptance: acceptProbs.length > 0 ? Math.min(...acceptProbs) : null,
    maxPredictedAcceptance: acceptProbs.length > 0 ? Math.max(...acceptProbs) : null,
    fairnessDistribution,
    valueDeltaDistribution: bucketize(valueDeltas, true),
    confidenceDistribution: bucketize(confidenceScores, true),
    acceptedTradeProbabilityDistribution: bucketize(acceptedProbs, false),
    avgAcceptedTradeProbability: average(acceptedProbs),
    leagueSettingsSensitivity,
  }
}
