import { describe, expect, it } from 'vitest'

import {
  runSeasonSimulation,
  runPlayoffSimulation,
  runDynastySimulation,
} from '@/lib/simulation-lab'

describe('SimulationLabService', () => {
  it('runs season simulation with normalized sport and bounded outputs', () => {
    const result = runSeasonSimulation({
      sport: 'soccer',
      team: { mean: 102, stdDev: 10 },
      opponents: [
        { mean: 100 },
        { mean: 98 },
        { mean: 95 },
        { mean: 93 },
      ],
      playoffSpots: 2,
      byeSpots: 1,
      iterations: 2500,
    })

    expect(result.sport).toBe('SOCCER')
    expect(result.iterations).toBe(2500)
    expect(result.expectedWins).toBeGreaterThanOrEqual(0)
    expect(result.expectedWins).toBeLessThanOrEqual(4)
    expect(result.playoffProbability).toBeGreaterThanOrEqual(0)
    expect(result.playoffProbability).toBeLessThanOrEqual(1)
    expect(result.byeWeekProbability).toBeGreaterThanOrEqual(0)
    expect(result.byeWeekProbability).toBeLessThanOrEqual(1)
  })

  it('runs playoff simulation with clamped iteration floor and sport normalization', () => {
    const result = runPlayoffSimulation({
      sport: 'ncaaf',
      teams: [
        { mean: 106, stdDev: 11 },
        { mean: 103, stdDev: 11 },
        { mean: 99, stdDev: 11 },
        { mean: 96, stdDev: 11 },
      ],
      targetTeamIndex: 0,
      iterations: 10,
    })

    expect(result.sport).toBe('NCAAF')
    expect(result.iterations).toBe(100)
    expect(result.championshipProbability).toBeGreaterThanOrEqual(0)
    expect(result.championshipProbability).toBeLessThanOrEqual(1)
    expect(result.finalistProbability).toBeGreaterThanOrEqual(0)
    expect(result.finalistProbability).toBeLessThanOrEqual(1)
  })

  it('runs dynasty outcomes across seasons and iterations per season', () => {
    const result = runDynastySimulation({
      sport: 'nba',
      teams: [
        { mean: 110, stdDev: 10, name: 'A' },
        { mean: 106, stdDev: 10, name: 'B' },
        { mean: 102, stdDev: 10, name: 'C' },
        { mean: 98, stdDev: 10, name: 'D' },
      ],
      seasons: 4,
      playoffSpots: 2,
      iterationsPerSeason: 3,
    })

    expect(result.sport).toBe('NBA')
    expect(result.seasonsRun).toBe(4)
    expect(result.iterationsPerSeason).toBe(3)
    expect(result.outcomes).toHaveLength(4)

    const totalChampionships = result.outcomes.reduce(
      (sum, row) => sum + row.championships,
      0
    )
    expect(totalChampionships).toBe(12)
    for (const row of result.outcomes) {
      expect(row.totalWins).toBeGreaterThanOrEqual(0)
      expect(row.avgFinish).toBeGreaterThanOrEqual(1)
      expect(row.avgFinish).toBeLessThanOrEqual(4)
      expect(row.playoffAppearances).toBeGreaterThanOrEqual(0)
      expect(row.playoffAppearances).toBeLessThanOrEqual(12)
    }
  })
})
