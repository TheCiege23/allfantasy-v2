import { describe, expect, it } from 'vitest'

import { buildTeamForecastTrajectory } from '@/lib/trajectory/consumers/seasonForecast'
import { summarizeTrajectory } from '@/lib/trajectory/summarize'
import type { SeasonForecastHistoryRow } from '@/lib/trajectory/adapters/seasonForecast'
import type { Trajectory } from '@/lib/trajectory/types'
import type { TeamSeasonForecast } from '@/lib/season-forecast/types'

function team(teamId: string, o: Partial<TeamSeasonForecast>): TeamSeasonForecast {
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
    ...o,
  }
}
function row(week: number, at: string, teams: TeamSeasonForecast[]): SeasonForecastHistoryRow {
  return { week, generatedAt: at, teamForecasts: teams }
}

const PARAMS = { leagueId: 'lg', season: 2026, teamId: 't1' }

describe('buildTeamForecastTrajectory (Phase 3.4 consumer)', () => {
  it('produces a real delta when a previous snapshot exists', async () => {
    const rows = [
      row(1, '2026-09-08', [team('t1', { playoffProbability: 40, championshipProbability: 8, expectedWins: 6.1, expectedFinalSeed: 6, confidenceScore: 0.7 })]),
      row(2, '2026-09-15', [team('t1', { playoffProbability: 58, championshipProbability: 12, expectedWins: 6.9, expectedFinalSeed: 4, confidenceScore: 0.8 })]),
    ]
    const traj = await buildTeamForecastTrajectory(PARAMS, rows)

    expect(traj.playoffProbability?.hasChange).toBe(true)
    expect(traj.playoffProbability?.direction).toBe('up')
    expect(traj.playoffProbability?.absolute).toBe(18)
    expect(traj.playoffProbability?.currentValue).toBe(58)
    expect(traj.playoffProbability?.previousValue).toBe(40)
    // Seed dropped 6 → 4 (an improvement); the raw movement is still reported honestly.
    expect(traj.expectedFinalSeed?.direction).toBe('down')
    expect(traj.expectedFinalSeed?.absolute).toBe(-2)
    // Source confidence flows through (current point's).
    expect(traj.playoffProbability?.confidence).toBe(0.8)
    expect(traj.supported ?? traj.playoffProbability?.supported).toBe(true)
  })

  it('self-gates with only one snapshot — no fabricated movement', async () => {
    const rows = [row(1, '2026-09-08', [team('t1', { playoffProbability: 40 })])]
    const traj = await buildTeamForecastTrajectory(PARAMS, rows)

    expect(traj.playoffProbability?.hasChange).toBe(false)
    expect(traj.playoffProbability?.direction).toBeNull()
    expect(traj.playoffProbability?.absolute).toBeNull()
    expect(traj.playoffProbability?.currentValue).toBe(40)
    expect(traj.playoffProbability?.previousValue).toBeNull()
  })

  it('never fabricates an explanation (Season Forecast stores no per-week reason)', async () => {
    const rows = [
      row(1, '2026-09-08', [team('t1', { playoffProbability: 40 })]),
      row(2, '2026-09-15', [team('t1', { playoffProbability: 58 })]),
    ]
    const traj = await buildTeamForecastTrajectory(PARAMS, rows)
    expect(traj.playoffProbability?.whyChanged).toBeNull()
  })

  it('reports null percent on a zero baseline (no honest denominator)', async () => {
    const rows = [
      row(1, '2026-09-08', [team('t1', { championshipProbability: 0 })]),
      row(2, '2026-09-15', [team('t1', { championshipProbability: 10 })]),
    ]
    const traj = await buildTeamForecastTrajectory(PARAMS, rows)
    expect(traj.championshipProbability?.hasChange).toBe(true)
    expect(traj.championshipProbability?.absolute).toBe(10)
    expect(traj.championshipProbability?.percent).toBeNull()
  })
})

describe('summarizeTrajectory', () => {
  it('propagates supported=false so an unsupported metric can never look like a trend', () => {
    const unsupported: Trajectory = {
      metricId: 'league.healthScore',
      current: { value: 82, timestamp: 't' },
      previous: null,
      delta: null,
      history: [{ value: 82, timestamp: 't' }],
      supported: false,
      whyChanged: null,
    }
    const s = summarizeTrajectory(unsupported)
    expect(s.supported).toBe(false)
    expect(s.hasChange).toBe(false)
    expect(s.direction).toBeNull()
    expect(s.currentValue).toBe(82)
  })
})
