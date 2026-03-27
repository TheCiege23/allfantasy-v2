import { describe, expect, it } from 'vitest'
import {
  buildDraftStrategyShift,
  buildPositionValueChange,
  buildWaiverStrategyTrend,
} from '@/lib/strategy-meta-engine'

describe('meta analysis service', () => {
  it('builds a rising draft strategy shift with deterministic usage deltas', () => {
    const result = buildDraftStrategyShift({
      strategyType: 'ZeroRB',
      strategyLabel: 'Zero RB / Defer primary',
      sport: 'NFL',
      leagueFormat: 'dynasty_sf',
      usageRate: 0.31,
      successRate: 0.58,
      sampleSize: 112,
      recentUsageRate: 0.34,
      baselineUsageRate: 0.28,
      recentSuccessRate: 0.59,
      baselineSuccessRate: 0.55,
      earlyRoundFocus: ['WR', 'TE'],
      supportingSignals: ['No RB selected in the first four rounds'],
      confidence: 0.81,
    })

    expect(result.trendingDirection).toBe('Rising')
    expect(result.usageDelta).toBe(0.06)
    expect(result.successDelta).toBe(0.04)
    expect(result.shiftLabel).toContain('priority rising')
    expect(result.signalStrength).toBeGreaterThan(40)
    expect(result.summary).toContain('Zero RB / Defer primary')
  })

  it('builds a position value change from draft share and trade demand inputs', () => {
    const result = buildPositionValueChange({
      position: 'RB',
      sport: 'NFL',
      avgValueGiven: 6.1,
      avgValueReceived: 7.5,
      sampleSize: 55,
      marketTrend: 'Rising',
      draftShare: 0.26,
      priorDraftShare: 0.18,
      rosterPressure: 0.31,
      tradeDemandScore: 12.4,
      usageRate: 0.29,
      confidence: 0.77,
    })

    expect(result.direction).toBe('Rising')
    expect(result.draftShareDelta).toBe(0.08)
    expect(result.valueScore).toBeGreaterThan(20)
    expect(result.confidence).toBe(0.77)
    expect(result.summary).toContain('RB is gaining value')
  })

  it('builds a rising waiver trend with streaming context', () => {
    const result = buildWaiverStrategyTrend({
      sport: 'NBA',
      addCount: 18,
      dropCount: 11,
      windowDays: 7,
      primaryPosition: 'C',
      topAddPositions: ['C', 'PG', 'SF'],
      faabAggression: 11.2,
      churnRate: 0.61,
      streamingScore: 74.6,
      priorNetRate: 0.2,
      currentNetRate: 1.0,
      confidence: 0.83,
    })

    expect(result.trendDirection).toBe('Rising')
    expect(result.netAdds).toBe(7)
    expect(result.addRatePerDay).toBe(2.57)
    expect(result.streamingScore).toBe(74.6)
    expect(result.summary).toContain('C')
  })
})
