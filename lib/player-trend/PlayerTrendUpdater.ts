/**
 * Updates PlayerMetaTrend from aggregated signals: compute score, classify direction, upsert.
 */
import { prisma } from '@/lib/prisma'
import { calculateTrendScore, normalizeTrendScoreTo100 } from './TrendScoreCalculator'
import { classifyTrendDirection } from './TrendDirectionClassifier'
import { aggregateSignalsForPlayer, getPreviousTrendScore } from './TrendSignalAggregator'
import type { TrendDirection } from './types'

export interface PlayerTrendUpdateResult {
  playerId: string
  sport: string
  trendScore: number
  trendingDirection: TrendDirection
  updated: boolean
}

/**
 * Recompute and upsert PlayerMetaTrend for one player/sport.
 */
export async function updatePlayerTrend(
  playerId: string,
  sport: string
): Promise<PlayerTrendUpdateResult> {
  const [{ signals, eventCount }, previousScore] = await Promise.all([
    aggregateSignalsForPlayer(playerId, sport),
    getPreviousTrendScore(playerId, sport),
  ])

  const rawScore = calculateTrendScore(signals)
  const score100 = normalizeTrendScoreTo100(rawScore)
  const direction = classifyTrendDirection({
    currentScore: score100,
    previousScore,
    eventCount,
  })

  const existing = await prisma.playerMetaTrend.findUnique({
    where: { uniq_player_meta_trend_player_sport: { playerId, sport } },
  })

  const previousTrendScore = existing?.trendScore ?? null
  await prisma.playerMetaTrend.upsert({
    where: { uniq_player_meta_trend_player_sport: { playerId, sport } },
    create: {
      playerId,
      sport,
      trendScore: score100,
      addRate: signals.addRate,
      dropRate: signals.dropRate,
      tradeInterest: signals.tradeInterest,
      draftFrequency: signals.draftFrequency,
      lineupStartRate: signals.lineupStartRate,
      injuryImpact: signals.injuryImpact,
      trendingDirection: direction,
      previousTrendScore,
    },
    update: {
      trendScore: score100,
      addRate: signals.addRate,
      dropRate: signals.dropRate,
      tradeInterest: signals.tradeInterest,
      draftFrequency: signals.draftFrequency,
      lineupStartRate: signals.lineupStartRate,
      injuryImpact: signals.injuryImpact,
      trendingDirection: direction,
      previousTrendScore: existing?.trendScore ?? previousTrendScore,
    },
  })

  return {
    playerId,
    sport,
    trendScore: score100,
    trendingDirection: direction,
    updated: true,
  }
}

/**
 * Record a single signal event (no trend recompute).
 */
export async function recordTrendSignal(
  playerId: string,
  sport: string,
  signalType: string,
  options: { value?: number; leagueId?: string } = {}
): Promise<void> {
  await prisma.trendSignalEvent.create({
    data: {
      playerId,
      sport,
      signalType,
      value: options.value ?? 1,
      leagueId: options.leagueId ?? null,
    },
  })
}

/**
 * Record one or more signals and recompute trend for affected players.
 * Use after waiver processing or batch events.
 */
export async function recordTrendSignalsAndUpdate(
  events: Array<{ playerId: string; sport: string; signalType: string; value?: number; leagueId?: string }>
): Promise<PlayerTrendUpdateResult[]> {
  const seen = new Set<string>()
  for (const e of events) {
    await recordTrendSignal(e.playerId, e.sport, e.signalType, {
      value: e.value,
      leagueId: e.leagueId,
    })
    seen.add(`${e.playerId}:${e.sport}`)
  }
  const results: PlayerTrendUpdateResult[] = []
  for (const key of seen) {
    const [playerId, sport] = key.split(':')
    if (playerId && sport) results.push(await updatePlayerTrend(playerId, sport))
  }
  return results
}
