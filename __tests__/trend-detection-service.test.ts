import { describe, expect, it } from 'vitest'
import {
  buildTrendDeterministicSignals,
  buildTrendSignalSnapshot,
  classifyTrendFeedType,
  type TrendGameStatSample,
} from '@/lib/player-trend/TrendDetectionService'
import type { TrendingPlayerRow } from '@/lib/player-trend/PlayerTrendAnalyzer'

function buildRow(overrides: Partial<TrendingPlayerRow> = {}): TrendingPlayerRow {
  return {
    playerId: 'player-1',
    sport: 'NBA',
    trendScore: 76,
    trendingDirection: 'Rising',
    addRate: 0.42,
    dropRate: 0.11,
    tradeInterest: 0.14,
    draftFrequency: 0.3,
    lineupStartRate: 0.78,
    injuryImpact: 0.02,
    updatedAt: new Date('2026-03-20T00:00:00.000Z'),
    ...overrides,
  }
}

function buildStat(season: number, weekOrRound: number, fantasyPoints: number, minutes: number, fga: number): TrendGameStatSample {
  return {
    sport: 'NBA',
    season,
    weekOrRound,
    fantasyPoints,
    normalizedStatMap: {
      minutes,
      fga,
    },
  }
}

describe('trend detection service', () => {
  it('builds recent vs prior windows from game stats', () => {
    const row = buildRow()
    const stats = [
      buildStat(2026, 8, 42, 35, 21),
      buildStat(2026, 7, 39, 34, 20),
      buildStat(2026, 6, 41, 36, 22),
      buildStat(2026, 5, 38, 33, 19),
      buildStat(2026, 4, 24, 28, 13),
      buildStat(2026, 3, 22, 27, 12),
      buildStat(2026, 2, 26, 29, 14),
      buildStat(2026, 1, 23, 30, 13),
    ]

    const snapshot = buildTrendSignalSnapshot({
      row,
      previousTrendScore: 64,
      stats,
      analytics: null,
      timeframe: '7d',
    })
    const signals = buildTrendDeterministicSignals({
      row,
      previousTrendScore: 64,
      stats,
      analytics: null,
      timeframe: '7d',
    })

    expect(snapshot.dataSource).toBe('game_stats')
    expect(snapshot.recentGamesSample).toBe(4)
    expect(snapshot.priorGamesSample).toBe(4)
    expect(snapshot.recentFantasyPointsAvg).toBeGreaterThan(snapshot.priorFantasyPointsAvg ?? 0)
    expect(snapshot.recentUsageValue).toBeGreaterThan(snapshot.priorUsageValue ?? 0)
    expect(signals.performanceDelta).toBeGreaterThan(10)
    expect(signals.usageChange).toBeGreaterThan(0.15)
    expect(signals.minutesOrSnapShare).toBeGreaterThan(0.85)
    expect(signals.confidence).toBeGreaterThan(0.8)
  })

  it('flags sell-high profiles when production outpaces opportunity growth', () => {
    const row = buildRow({
      trendingDirection: 'Hot',
      trendScore: 86,
      tradeInterest: 0.28,
    })
    const snapshot = {
      dataSource: 'analytics_snapshot' as const,
      recentGamesSample: 0,
      priorGamesSample: 0,
      recentFantasyPointsAvg: 24,
      priorFantasyPointsAvg: 18,
      recentUsageValue: 0.56,
      priorUsageValue: 0.53,
      recentMinutesOrShare: 0.79,
      priorMinutesOrShare: 0.78,
      recentEfficiency: 43,
      priorEfficiency: 35,
      expectedFantasyPointsPerGame: 19.5,
      seasonFantasyPointsPerGame: 20,
      expectedGap: 4.5,
      weeklyVolatility: 2.4,
      breakoutRating: 0.44,
      currentAdpTrend: -2.1,
    }
    const signals = {
      performanceDelta: 6,
      usageChange: 0.03,
      minutesOrSnapShare: 0.79,
      efficiencyScore: 43,
      volumeChange: 0.01,
      efficiencyDelta: 8,
      confidence: 0.74,
      signalStrength: 72,
    }

    expect(
      classifyTrendFeedType({
        row,
        signals,
        snapshot,
      })
    ).toBe('sell_high_candidate')
  })
})
