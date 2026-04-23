import { describe, expect, it } from 'vitest'
import { resolveNflDraftPoolAnalytics, RI_MIN_LEAD_OVER_SNAPSHOT_MS } from '@/lib/draft/analytics/nfl-rolling-insights-draft-analytics'

describe('resolveNflDraftPoolAnalytics', () => {
  const season = '2025'
  const snapTime = new Date('2025-01-01T00:00:00Z')
  const riTime = new Date(snapTime.getTime() + RI_MIN_LEAD_OVER_SNAPSHOT_MS + 1_000)

  it('keeps snapshot when RI is absent', () => {
    const r = resolveNflDraftPoolAnalytics({
      snapshot: { fantasyPointsPerGame: 14.2, lifetimeValue: 42, updatedAt: snapTime },
      rollingInsights: null,
      identityMatchConfidence: 'high',
      currentStatsSeason: season,
    })
    expect(r.primarySource).toBe('snapshot')
    expect(r.fantasyPointsPerGame).toBe(14.2)
    expect(r.lifetimeValue).toBe(42)
  })

  it('overrides PPG when RI is newer, confident, and season matches', () => {
    const r = resolveNflDraftPoolAnalytics({
      snapshot: { fantasyPointsPerGame: 12, lifetimeValue: 40, updatedAt: snapTime },
      rollingInsights: {
        fantasyPointsPerGame: 18.5,
        fantasyPointsSeason: 300,
        gamesPlayed: 15,
        season: season,
        updatedAt: riTime,
      },
      identityMatchConfidence: 'high',
      currentStatsSeason: season,
    })
    expect(r.primarySource).toBe('rolling_insights')
    expect(r.fantasyPointsPerGame).toBe(18.5)
    expect(r.lifetimeValue).toBe(40)
  })

  it('does not override when identity match is none', () => {
    const r = resolveNflDraftPoolAnalytics({
      snapshot: { fantasyPointsPerGame: 12, lifetimeValue: null, updatedAt: snapTime },
      rollingInsights: {
        fantasyPointsPerGame: 20,
        fantasyPointsSeason: 100,
        gamesPlayed: 15,
        season: season,
        updatedAt: riTime,
      },
      identityMatchConfidence: 'none',
      currentStatsSeason: season,
    })
    expect(r.primarySource).toBe('snapshot')
    expect(r.fantasyPointsPerGame).toBe(12)
    expect(r.rollingInsightsSupplemental?.fantasyPointsPerGame).toBe(20)
  })
})
