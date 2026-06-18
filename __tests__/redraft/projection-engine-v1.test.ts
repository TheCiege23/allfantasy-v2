import { describe, expect, it } from 'vitest'
import { buildAllFantasyProjection } from '@/lib/redraft/projectionEngine'

describe('AllFantasy Projection Engine V1', () => {
  it('returns weekly, ROS, floor, ceiling, and high confidence from cached AF snapshots', () => {
    const projection = buildAllFantasyProjection({
      playerId: 'p1',
      playerName: 'Starter RB',
      sport: 'NFL',
      position: 'RB',
      currentWeek: 6,
      totalWeeks: 17,
      allFantasyWeeklyProjection: 15.2,
      allFantasyConfidenceLevel: 'high',
    })

    expect(projection.weeklyProjection).toBe(15.2)
    expect(projection.restOfSeasonProjection).toBeGreaterThan(150)
    expect(projection.floorProjection).toBeGreaterThan(0)
    expect(projection.ceilingProjection).toBeGreaterThan(projection.weeklyProjection ?? 0)
    expect(projection.confidenceLevel).toBe('high')
    expect(projection.source).toBe('allfantasy_snapshot')
  })

  it('converts RollingInsights raw season data into weekly and ROS projections', () => {
    const projection = buildAllFantasyProjection({
      playerId: 'p2',
      playerName: 'Rolling WR',
      sport: 'NFL',
      position: 'WR',
      currentWeek: 8,
      totalWeeks: 17,
      rollingInsightsStats: {
        fantasyPointsPerGame: 12.4,
        gamesPlayed: 6,
      },
    })

    expect(projection.weeklyProjection).toBe(12.4)
    expect(projection.restOfSeasonProjection).toBe(124)
    expect(projection.confidenceLevel).toBe('medium')
    expect(projection.source).toBe('rolling_insights')
    expect(projection.reasons.join(' ')).toMatch(/RollingInsights/)
  })

  it('sets weekly projection to zero on bye without losing ROS projection', () => {
    const projection = buildAllFantasyProjection({
      playerId: 'p3',
      playerName: 'Bye QB',
      sport: 'NFL',
      position: 'QB',
      currentWeek: 9,
      totalWeeks: 17,
      byeWeek: 9,
      providerWeeklyProjection: 20,
    })

    expect(projection.weeklyProjection).toBe(0)
    expect(projection.floorProjection).toBe(0)
    expect(projection.ceilingProjection).toBe(0)
    expect(projection.restOfSeasonProjection).toBe(160)
    expect(projection.reasons.join(' ')).toMatch(/Bye week 9/)
  })

  it('reduces injured players and reports lower confidence', () => {
    const projection = buildAllFantasyProjection({
      playerId: 'p4',
      playerName: 'Questionable WR',
      sport: 'NFL',
      position: 'WR',
      currentWeek: 7,
      totalWeeks: 17,
      providerWeeklyProjection: 14,
      injuryStatus: 'Questionable',
    })

    expect(projection.weeklyProjection).toBeLessThan(14)
    expect(projection.confidenceScore).toBeLessThan(82)
    expect(projection.reasons.join(' ')).toMatch(/Questionable/)
  })

  it('uses ADP as a low-confidence fallback instead of fabricating an unavailable result', () => {
    const projection = buildAllFantasyProjection({
      playerId: 'p5',
      playerName: 'Ranked TE',
      sport: 'NFL',
      position: 'TE',
      currentWeek: 6,
      totalWeeks: 17,
      adp: 80,
    })

    expect(projection.weeklyProjection).toBeGreaterThan(0)
    expect(projection.source).toBe('adp_fallback')
    expect(projection.confidenceLevel).toBe('low')
    expect(projection.missingDataFlags.join(' ')).toMatch(/ADP/)
  })

  it('returns missing when there is no usable signal', () => {
    const projection = buildAllFantasyProjection({
      playerId: 'p6',
      playerName: 'Unknown Player',
      sport: 'NFL',
      position: 'RB',
    })

    expect(projection.weeklyProjection).toBeNull()
    expect(projection.restOfSeasonProjection).toBeNull()
    expect(projection.confidenceLevel).toBe('none')
    expect(projection.source).toBe('missing')
  })
})
