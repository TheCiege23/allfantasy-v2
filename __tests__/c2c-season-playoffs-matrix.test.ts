import { describe, expect, it } from 'vitest'

import { runPlayoffSimulation, runSeasonSimulation } from '@/lib/simulation-lab'

describe('C2C season and playoffs matrix (4 sports)', () => {
  const sports = ['NFL', 'NBA', 'NCAAB', 'NCAAF'] as const

  it('runs season simulation for each C2C sport with bounded scoring outcomes', () => {
    for (const sport of sports) {
      const season = runSeasonSimulation({
        sport,
        team: { mean: 112, stdDev: 11, name: `${sport}-Team` },
        opponents: [
          { mean: 108, stdDev: 11, name: 'Opp-1' },
          { mean: 105, stdDev: 10, name: 'Opp-2' },
          { mean: 102, stdDev: 10, name: 'Opp-3' },
          { mean: 99, stdDev: 9, name: 'Opp-4' },
        ],
        playoffSpots: 2,
        byeSpots: 1,
        iterations: 1200,
      })

      expect(season.sport).toBe(sport)
      expect(season.expectedWins).toBeGreaterThanOrEqual(0)
      expect(season.expectedWins).toBeLessThanOrEqual(4)
      expect(season.playoffProbability).toBeGreaterThanOrEqual(0)
      expect(season.playoffProbability).toBeLessThanOrEqual(1)
      expect(season.byeWeekProbability).toBeGreaterThanOrEqual(0)
      expect(season.byeWeekProbability).toBeLessThanOrEqual(1)
    }
  })

  it('sets up playoffs and crowns a champion distribution for each C2C sport', () => {
    for (const sport of sports) {
      const teams = [
        { mean: 114, stdDev: 12, name: `${sport}-Seed1` },
        { mean: 109, stdDev: 11, name: `${sport}-Seed2` },
        { mean: 104, stdDev: 10, name: `${sport}-Seed3` },
        { mean: 99, stdDev: 10, name: `${sport}-Seed4` },
      ]

      const championshipProbabilities = teams.map((_, targetTeamIndex) =>
        runPlayoffSimulation({
          sport,
          teams,
          targetTeamIndex,
          iterations: 2000,
        }).championshipProbability,
      )

      const totalChampionshipProbability = championshipProbabilities.reduce((sum, x) => sum + x, 0)
      expect(totalChampionshipProbability).toBeGreaterThan(0.8)
      expect(totalChampionshipProbability).toBeLessThan(1.2)
      expect(Math.max(...championshipProbabilities)).toBeGreaterThan(0)
    }
  })
})
