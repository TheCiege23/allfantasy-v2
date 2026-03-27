import { describe, expect, it } from 'vitest'
import { buildLineupForSimulationPreset, getSimulationTeamPresets } from '@/lib/matchup-simulator'
import { simulateDeterministicMatchup } from '@/lib/simulation-engine/DeterministicMatchupEngine'

describe('deterministic matchup engine', () => {
  it('returns the same output for the same lineup and schedule input', () => {
    const [teamA, teamB] = getSimulationTeamPresets('SOCCER')

    const input = {
      sport: 'SOCCER',
      weekOrPeriod: 4,
      iterations: 1500,
      teamA: {
        lineup: buildLineupForSimulationPreset('SOCCER', teamA),
        scheduleFactors: teamA.scheduleFactors,
      },
      teamB: {
        lineup: buildLineupForSimulationPreset('SOCCER', teamB),
        scheduleFactors: teamB.scheduleFactors,
      },
    }

    const first = simulateDeterministicMatchup(input)
    const second = simulateDeterministicMatchup(input)

    expect(first.deterministicSeed).toBe(second.deterministicSeed)
    expect(first.winProbabilityA).toBe(second.winProbabilityA)
    expect(first.expectedScoreA).toBe(second.expectedScoreA)
    expect(first.expectedScoreB).toBe(second.expectedScoreB)
    expect(first.scoreDistributionA).toEqual(second.scoreDistributionA)
    expect(first.scoreDistributionB).toEqual(second.scoreDistributionB)
    expect(first.slotComparisons).toEqual(second.slotComparisons)
  })

  it('changes the outcome when a lineup slot changes', () => {
    const [teamA, teamB] = getSimulationTeamPresets('NBA')
    const lineupA = buildLineupForSimulationPreset('NBA', teamA)
    const lineupB = buildLineupForSimulationPreset('NBA', teamB)

    const baseline = simulateDeterministicMatchup({
      sport: 'NBA',
      weekOrPeriod: 2,
      teamA: { lineup: lineupA, scheduleFactors: teamA.scheduleFactors },
      teamB: { lineup: lineupB, scheduleFactors: teamB.scheduleFactors },
      iterations: 1500,
    })

    const changedLineupA = lineupA.map((slot) =>
      slot.slotId === 'PG'
        ? {
            ...slot,
            projection: slot.projection + 6,
            ceiling: (slot.ceiling ?? slot.projection + 4) + 6,
          }
        : slot
    )

    const changed = simulateDeterministicMatchup({
      sport: 'NBA',
      weekOrPeriod: 2,
      teamA: { lineup: changedLineupA, scheduleFactors: teamA.scheduleFactors },
      teamB: { lineup: lineupB, scheduleFactors: teamB.scheduleFactors },
      iterations: 1500,
    })

    expect(changed.deterministicSeed).not.toBe(baseline.deterministicSeed)
    expect(changed.expectedScoreA).toBeGreaterThan(baseline.expectedScoreA)
    expect(changed.winProbabilityA).toBeGreaterThanOrEqual(baseline.winProbabilityA)
  })
})
