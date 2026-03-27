import { describe, expect, it } from 'vitest'
import {
  buildDeterministicMarketValueTrend,
  buildDynastyValuationBreakdown,
  classifyDynastyLifecycleStage,
  getAgeCurve,
  getCareerTrajectory,
} from '@/lib/dynasty-intelligence'

describe('dynasty projection service', () => {
  it('builds a normalized age curve and deterministic market trend for a young soccer forward', () => {
    const ageCurve = getAgeCurve('soccer', 'fw', 22)
    const marketTrend = buildDeterministicMarketValueTrend({
      sport: 'SOCCER',
      position: 'FWD',
      age: 22,
      currentValue: 4700,
      ageCurve,
    })

    expect(ageCurve.sport).toBe('SOCCER')
    expect(ageCurve.position).toBe('FWD')
    expect(ageCurve.currentAge).toBe(22)
    expect(ageCurve.points.find((point) => point.age === 22)?.multiplier).toBe(ageCurve.currentMultiplier)
    expect(['Prospect', 'Ascendant', 'Prime']).toContain(ageCurve.lifecycleStage)
    expect(ageCurve.yearsToPeakStart).toBeGreaterThanOrEqual(0)
    expect(marketTrend.trendScore).toBeGreaterThan(40)
    expect(marketTrend.demandScore).toBeGreaterThan(0)
    expect(marketTrend.signals.length).toBeGreaterThan(0)
  })

  it('rewards superflex quarterbacks and projects a positive trajectory for young passers', () => {
    const ageCurve = getAgeCurve('NFL', 'QB', 23)
    const marketTrend = buildDeterministicMarketValueTrend({
      sport: 'NFL',
      position: 'QB',
      age: 23,
      currentValue: 5400,
      ageCurve,
      row: {
        trendScore: 78,
        previousTrendScore: 70,
        addRate: 0.18,
        dropRate: 0.05,
        tradeInterest: 0.24,
        draftFrequency: 0.22,
        lineupStartRate: 0.81,
        injuryImpact: 0.04,
        trendingDirection: 'RISING',
        updatedAt: new Date('2026-03-20T12:00:00.000Z'),
      },
    })
    const trajectory = getCareerTrajectory('NFL', 'QB', 23, 5400, marketTrend)
    const superflexBreakdown = buildDynastyValuationBreakdown({
      sport: 'NFL',
      position: 'QB',
      age: 23,
      currentValue: 5400,
      ageCurve,
      marketValueTrend: marketTrend,
      careerTrajectory: trajectory,
      isSuperFlex: true,
      isTightEndPremium: false,
    })
    const oneQbBreakdown = buildDynastyValuationBreakdown({
      sport: 'NFL',
      position: 'QB',
      age: 23,
      currentValue: 5400,
      ageCurve,
      marketValueTrend: marketTrend,
      careerTrajectory: trajectory,
      isSuperFlex: false,
      isTightEndPremium: false,
    })

    expect(trajectory.points).toHaveLength(5)
    expect(trajectory.points[0]?.note).toBe('Current value anchor')
    expect(trajectory.peakProjectedValue).toBeGreaterThanOrEqual(5400)
    expect(trajectory.valueChangePctYear3).toBeGreaterThan(0)
    expect(['Stable', 'Ascending']).toContain(trajectory.trajectoryLabel)
    expect(superflexBreakdown).not.toBeNull()
    expect(oneQbBreakdown).not.toBeNull()
    expect(superflexBreakdown?.positionMultiplier).toBeGreaterThan(oneQbBreakdown?.positionMultiplier ?? 0)
    expect(superflexBreakdown?.dynastyScore).toBeGreaterThan(oneQbBreakdown?.dynastyScore ?? 0)
  })

  it('identifies decline and cliff risk windows for aging receivers', () => {
    const lifecycleStage = classifyDynastyLifecycleStage({
      age: 34,
      peakAgeStart: 25,
      peakAgeEnd: 29,
      cliffAge: 33,
    })
    const ageCurve = getAgeCurve('NFL', 'WR', 34)
    const marketTrend = buildDeterministicMarketValueTrend({
      sport: 'NFL',
      position: 'WR',
      age: 34,
      currentValue: 3600,
      ageCurve,
      row: {
        trendScore: 28,
        previousTrendScore: 36,
        addRate: 0.04,
        dropRate: 0.15,
        tradeInterest: 0.06,
        draftFrequency: 0.05,
        lineupStartRate: 0.48,
        injuryImpact: 0.19,
        trendingDirection: 'FALLING',
        updatedAt: new Date('2026-03-20T12:00:00.000Z'),
      },
    })
    const trajectory = getCareerTrajectory('NFL', 'WR', 34, 3600, marketTrend)

    expect(lifecycleStage).toBe('Cliff Risk')
    expect(ageCurve.lifecycleStage).toBe('Cliff Risk')
    expect(['Declining', 'Cliff Risk']).toContain(trajectory.trajectoryLabel)
    expect(trajectory.valueChangePctYear3).toBeLessThan(0)
    expect(trajectory.cliffYearOffset).not.toBeNull()
  })
})
