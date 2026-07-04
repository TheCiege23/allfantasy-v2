/**
 * Phase 3.3 — Historical Intelligence tests.
 * Covers snapshot capture/retrieval (lib/decision-os/behavioral/history/snapshots.ts)
 * and pure trend comparison (lib/decision-os/behavioral/history/trend.ts).
 */
import { describe, it, expect, vi } from 'vitest'
import { captureLeagueSnapshotHistory, getRecentLeagueSnapshots, type LeagueHistoryPoint, type LeagueSnapshotHistoryDeps } from '../../lib/decision-os/behavioral/history/snapshots'
import { computeLeagueTrend } from '../../lib/decision-os/behavioral/history/trend'
import type { LeagueBehavioralIntelligence } from '../../lib/decision-os/behavioral/league-intelligence'

function makeIntel(overrides: Partial<LeagueBehavioralIntelligence> = {}): LeagueBehavioralIntelligence {
  return {
    leagueId: 'lg-1',
    leagueEngagementScore: 80,
    leagueEngagementTier: 'active',
    participationDistribution: { totalManagers: 10, activeManagers: 9, inactiveManagers: 1, activePercent: 90, inactivePercent: 10 },
    inactiveManagerCount: 1,
    tradeActivity: { tier: 'moderate', count: 5, perManagerRate: 0.5, warnings: [] },
    waiverActivity: { tier: 'high', count: 20, perManagerRate: 2, warnings: [] },
    draftActivity: { tier: 'high', count: 10, perManagerRate: 1, warnings: [] },
    retentionRisk: 'low',
    retentionRiskReasons: [],
    commissionerWorkload: 'light',
    commissionerWorkloadItems: [],
    recommendations: [],
    healthNarrativeInputs: { engagementSummary: 'Stable', topConcern: null, standoutSignal: null },
    completeness: 95,
    derivedFrom: 100,
    managerCount: 10,
    derivedAt: new Date().toISOString(),
    ...overrides,
  } as LeagueBehavioralIntelligence
}

describe('captureLeagueSnapshotHistory', () => {
  it('writes exactly the fields derived from real league intelligence — nothing fabricated', async () => {
    const createSnapshot = vi.fn().mockResolvedValue(undefined)
    const deps: LeagueSnapshotHistoryDeps = { createSnapshot, findRecentSnapshots: vi.fn() }

    await captureLeagueSnapshotHistory(makeIntel({ leagueEngagementScore: 77.6 }), deps)

    expect(createSnapshot).toHaveBeenCalledWith({
      leagueId: 'lg-1',
      leagueEngagementScore: 78, // rounded
      leagueEngagementTier: 'active',
      tradeActivityRate: 0.5,
      waiverActivityRate: 2,
      draftActivityRate: 1,
    })
  })
})

describe('getRecentLeagueSnapshots', () => {
  it('delegates to deps.findRecentSnapshots with the requested take, most-recent-first', async () => {
    const points: LeagueHistoryPoint[] = [
      { capturedAt: '2026-07-03T00:00:00.000Z', leagueEngagementScore: 80, leagueEngagementTier: 'active', tradeActivityRate: 1, waiverActivityRate: 1, draftActivityRate: 1 },
    ]
    const findRecentSnapshots = vi.fn().mockResolvedValue(points)
    const deps: LeagueSnapshotHistoryDeps = { createSnapshot: vi.fn(), findRecentSnapshots }

    const result = await getRecentLeagueSnapshots('lg-1', 2, deps)

    expect(findRecentSnapshots).toHaveBeenCalledWith('lg-1', 2)
    expect(result).toEqual(points)
  })
})

describe('computeLeagueTrend', () => {
  it('returns insufficient_historical_data with zero snapshots', () => {
    const result = computeLeagueTrend([])
    expect(result).toEqual({ available: false, reason: 'insufficient_historical_data', snapshotCount: 0 })
  })

  it('returns insufficient_historical_data with exactly one snapshot — one point is not a trend', () => {
    const result = computeLeagueTrend([
      { capturedAt: 'T1', leagueEngagementScore: 80, leagueEngagementTier: 'active', tradeActivityRate: 1, waiverActivityRate: 1, draftActivityRate: 1 },
    ])
    expect(result).toEqual({ available: false, reason: 'insufficient_historical_data', snapshotCount: 1 })
  })

  it('computes an "up" trend from 2 real points with a real, non-noise score increase', () => {
    const result = computeLeagueTrend([
      { capturedAt: 'T2', leagueEngagementScore: 85, leagueEngagementTier: 'active', tradeActivityRate: 1, waiverActivityRate: 1, draftActivityRate: 1 },
      { capturedAt: 'T1', leagueEngagementScore: 75, leagueEngagementTier: 'active', tradeActivityRate: 1, waiverActivityRate: 1, draftActivityRate: 1 },
    ])
    expect(result.available).toBe(true)
    if (result.available) {
      expect(result.trend.direction).toBe('up')
      expect(result.trend.scoreDelta).toBe(10)
      expect(result.trend.magnitude).toBe(10)
      expect(result.trend.previousScore).toBe(75)
      expect(result.trend.currentScore).toBe(85)
      expect(result.trend.capturedAt).toBe('T2')
      expect(result.trend.comparedToCapturedAt).toBe('T1')
    }
  })

  it('computes a "down" trend when the current score is lower', () => {
    const result = computeLeagueTrend([
      { capturedAt: 'T2', leagueEngagementScore: 60, leagueEngagementTier: 'moderate', tradeActivityRate: 1, waiverActivityRate: 1, draftActivityRate: 1 },
      { capturedAt: 'T1', leagueEngagementScore: 80, leagueEngagementTier: 'active', tradeActivityRate: 1, waiverActivityRate: 1, draftActivityRate: 1 },
    ])
    expect(result.available).toBe(true)
    if (result.available) expect(result.trend.direction).toBe('down')
  })

  it('reports "flat" for a small delta below the noise threshold, not up/down', () => {
    const result = computeLeagueTrend([
      { capturedAt: 'T2', leagueEngagementScore: 81, leagueEngagementTier: 'active', tradeActivityRate: 1, waiverActivityRate: 1, draftActivityRate: 1 },
      { capturedAt: 'T1', leagueEngagementScore: 80, leagueEngagementTier: 'active', tradeActivityRate: 1, waiverActivityRate: 1, draftActivityRate: 1 },
    ])
    expect(result.available).toBe(true)
    if (result.available) expect(result.trend.direction).toBe('flat')
  })

  it('only ever compares the 2 most recent points, ignoring any further history passed in', () => {
    const result = computeLeagueTrend([
      { capturedAt: 'T3', leagueEngagementScore: 90, leagueEngagementTier: 'elite', tradeActivityRate: 1, waiverActivityRate: 1, draftActivityRate: 1 },
      { capturedAt: 'T2', leagueEngagementScore: 85, leagueEngagementTier: 'active', tradeActivityRate: 1, waiverActivityRate: 1, draftActivityRate: 1 },
      { capturedAt: 'T1', leagueEngagementScore: 10, leagueEngagementTier: 'dormant', tradeActivityRate: 1, waiverActivityRate: 1, draftActivityRate: 1 },
    ])
    expect(result.available).toBe(true)
    if (result.available) {
      expect(result.trend.previousScore).toBe(85)
      expect(result.trend.currentScore).toBe(90)
    }
  })
})
