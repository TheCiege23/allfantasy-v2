import { describe, expect, it } from 'vitest'
import { calculateTrendScore, normalizeTrendScoreTo100 } from '@/lib/player-trend/TrendScoreCalculator'
import { classifyTrendDirection } from '@/lib/player-trend/TrendDirectionClassifier'

describe('Player Trend Detection Engine', () => {
  it('increases trend score when adds/trade/draft/start signals rise', () => {
    const lowSignals = {
      addRate: 0.1,
      dropRate: 0.4,
      tradeInterest: 0.1,
      draftFrequency: 0.05,
      lineupStartRate: 0.2,
      injuryImpact: 0.4,
    }
    const highSignals = {
      addRate: 2.0,
      dropRate: 0.1,
      tradeInterest: 1.4,
      draftFrequency: 1.8,
      lineupStartRate: 0.9,
      injuryImpact: 0.0,
    }

    const lowScore = normalizeTrendScoreTo100(calculateTrendScore(lowSignals))
    const highScore = normalizeTrendScoreTo100(calculateTrendScore(highSignals))

    expect(highScore).toBeGreaterThan(lowScore)
    expect(highScore).toBeGreaterThanOrEqual(50)
  })

  it('classifies hot/rising/falling/cold/stable correctly', () => {
    expect(
      classifyTrendDirection({ currentScore: 78, previousScore: 68, eventCount: 8 })
    ).toBe('Hot')

    expect(
      classifyTrendDirection({ currentScore: 62, previousScore: 52, eventCount: 8 })
    ).toBe('Rising')

    expect(
      classifyTrendDirection({ currentScore: 42, previousScore: 52, eventCount: 8 })
    ).toBe('Falling')

    expect(
      classifyTrendDirection({ currentScore: 24, previousScore: 35, eventCount: 8 })
    ).toBe('Cold')

    expect(
      classifyTrendDirection({ currentScore: 60, previousScore: 58, eventCount: 2 })
    ).toBe('Stable')
  })
})
