import { describe, expect, it } from 'vitest'

import { getTrajectory } from '@/lib/trajectory/service'
import {
  createSeasonForecastAdapter,
  mapSeasonForecastPoints,
  type SeasonForecastHistoryRow,
} from '@/lib/trajectory/adapters/seasonForecast'
import {
  createLeagueEngagementAdapter,
  mapLeagueEngagementPoints,
} from '@/lib/trajectory/adapters/leagueEngagement'
import { createCurrentStateAdapter } from '@/lib/trajectory/adapters/currentState'
import type { TeamSeasonForecast } from '@/lib/season-forecast/types'
import type { LeagueHistoryPoint } from '@/lib/decision-os/behavioral/history/snapshots'

function team(teamId: string, overrides: Partial<TeamSeasonForecast>): TeamSeasonForecast {
  return {
    teamId,
    playoffProbability: 0,
    firstPlaceProbability: 0,
    championshipProbability: 0,
    expectedWins: 0,
    expectedFinalSeed: 0,
    finishRange: { min: 1, max: 12 },
    eliminationRisk: 0,
    byeProbability: 0,
    confidenceScore: 0,
    ...overrides,
  }
}

function row(week: number, generatedAt: string, teams: TeamSeasonForecast[]): SeasonForecastHistoryRow {
  return { week, generatedAt, teamForecasts: teams }
}

describe('Season Forecast adapter (SUPPORTED)', () => {
  const rows: SeasonForecastHistoryRow[] = [
    row(1, '2026-09-08', [team('t1', { playoffProbability: 40, confidenceScore: 0.6 })]),
    row(2, '2026-09-15', [
      team('t1', { playoffProbability: 58, confidenceScore: 0.75 }),
      team('t2', { playoffProbability: 12, confidenceScore: 0.7 }),
    ]),
  ]

  it('maps real rows to points, carrying the engine confidenceScore and skipping rows missing the team', () => {
    const points = mapSeasonForecastPoints(rows, 't1', 'playoffProbability')
    expect(points.map((p) => p.value)).toEqual([40, 58])
    expect(points.map((p) => p.confidence)).toEqual([0.6, 0.75])
    expect(points[1].label).toBe('Week 2')

    // t2 only appears in week 2 → exactly one point, no fabricated week-1 fill.
    expect(mapSeasonForecastPoints(rows, 't2', 'playoffProbability').map((p) => p.value)).toEqual([12])
  })

  it('skips NaN / missing values rather than inventing them', () => {
    const bad = [row(1, '2026-09-08', [team('t1', { playoffProbability: Number.NaN })])]
    expect(mapSeasonForecastPoints(bad, 't1', 'playoffProbability')).toEqual([])
  })

  it('produces a real, honest trajectory end-to-end through the service', async () => {
    const adapter = createSeasonForecastAdapter('playoffProbability', {
      async loadRows() {
        return rows
      },
    })
    const traj = await getTrajectory(adapter, { leagueId: 'lg', season: 2026, teamId: 't1' })
    expect(traj.metricId).toBe('season.playoffProbability')
    expect(traj.supported).toBe(true)
    expect(traj.delta?.absolute).toBe(18)
    expect(traj.delta?.direction).toBe('up')
    expect(traj.delta?.confidence).toBe(0.75)
    expect(traj.whyChanged).toBeNull() // engine stores no per-week reason
  })
})

describe('League Engagement adapter (SUPPORTED-WHEN-POPULATED)', () => {
  const history: LeagueHistoryPoint[] = [
    { capturedAt: '2026-02-01', leagueEngagementScore: 55, leagueEngagementTier: 'active', tradeActivityRate: 0.3, waiverActivityRate: 0.5, draftActivityRate: 0 },
    { capturedAt: '2026-01-01', leagueEngagementScore: 40, leagueEngagementTier: 'quiet', tradeActivityRate: 0.1, waiverActivityRate: 0.2, draftActivityRate: 0 },
  ]

  it('maps ledger points to trajectory points, tier as label, no invented confidence', () => {
    const points = mapLeagueEngagementPoints(history, 'leagueEngagementScore')
    expect(points.map((p) => p.value)).toEqual([55, 40])
    expect(points[0].label).toBe('active')
    expect(points.every((p) => p.confidence === undefined)).toBe(true)
  })

  it('wraps the decision-os reader via injected deps and computes a real delta', async () => {
    const adapter = createLeagueEngagementAdapter('leagueEngagementScore', {
      async createSnapshot() {},
      async findRecentSnapshots() {
        return history
      },
    })
    const traj = await getTrajectory(adapter, { leagueId: 'lg' })
    expect(traj.metricId).toBe('league.engagementScore')
    expect(traj.supported).toBe(true)
    expect(traj.delta?.absolute).toBe(15) // 55 (latest) − 40 (prior)
    expect(traj.delta?.direction).toBe('up')
  })

  it('returns an honest empty trajectory until the capture path has written rows', async () => {
    const adapter = createLeagueEngagementAdapter('leagueEngagementScore', {
      async createSnapshot() {},
      async findRecentSnapshots() {
        return []
      },
    })
    const traj = await getTrajectory(adapter, { leagueId: 'lg' })
    expect(traj.history).toEqual([])
    expect(traj.delta).toBeNull()
    expect(traj.current).toBeNull()
    expect(traj.supported).toBe(true) // store exists; it's just empty — not fabricated
  })
})

describe('Current-state adapter (UNSUPPORTED)', () => {
  it('yields at most one point so movement can never be implied', async () => {
    const adapter = createCurrentStateAdapter('league.healthScore')
    const traj = await getTrajectory(adapter, { value: 82, timestamp: '2026-02-01' })
    expect(traj.current?.value).toBe(82)
    expect(traj.previous).toBeNull()
    expect(traj.delta).toBeNull()
    expect(traj.supported).toBe(false)
    expect(traj.whyChanged).toBeNull()
  })
})
