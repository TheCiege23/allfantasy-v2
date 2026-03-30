import { describe, expect, it } from 'vitest'
import {
  explainOptimizedLineup,
  optimizeLineupDeterministic,
  type LineupOptimizerInput,
} from '@/lib/lineup-optimizer-engine'

describe('LineupOptimizerEngine', () => {
  it('maximizes projected points with slot constraints', () => {
    const input: LineupOptimizerInput = {
      sport: 'NFL',
      players: [
        { name: 'QB Alpha', positions: ['QB'], projectedPoints: 20 },
        { name: 'RB Alpha', positions: ['RB'], projectedPoints: 15 },
        { name: 'RB Beta', positions: ['RB'], projectedPoints: 14 },
        { name: 'WR Alpha', positions: ['WR'], projectedPoints: 16 },
        { name: 'WR Beta', positions: ['WR'], projectedPoints: 13 },
        { name: 'TE Alpha', positions: ['TE'], projectedPoints: 10 },
      ],
      slots: [{ code: 'QB' }, { code: 'RB' }, { code: 'RB' }, { code: 'WR' }, { code: 'FLEX' }],
    }

    const result = optimizeLineupDeterministic(input)
    expect(result.totalProjectedPoints).toBe(78)
    expect(result.unfilledSlots).toHaveLength(0)
    expect(result.starters.map((starter) => starter.playerName)).toEqual(
      expect.arrayContaining(['QB Alpha', 'RB Alpha', 'RB Beta', 'WR Alpha', 'WR Beta'])
    )
  })

  it('handles multi-position players and finds best assignment', () => {
    const result = optimizeLineupDeterministic({
      sport: 'NBA',
      players: [
        { name: 'Combo Guard', positions: ['PG', 'SG'], projectedPoints: 33 },
        { name: 'Pure Guard', positions: ['PG'], projectedPoints: 30 },
        { name: 'Wing', positions: ['SG'], projectedPoints: 31 },
      ],
      slots: [{ code: 'PG' }, { code: 'SG' }],
    })

    expect(result.totalProjectedPoints).toBe(64)
    expect(result.starters.map((starter) => starter.playerName)).toEqual(
      expect.arrayContaining(['Combo Guard', 'Wing'])
    )
  })

  it('reports unfilled required slots deterministically', async () => {
    const result = optimizeLineupDeterministic({
      sport: 'SOCCER',
      players: [{ name: 'Only Midfielder', positions: ['MID'], projectedPoints: 9.2 }],
      slots: [{ code: 'GKP' }, { code: 'MID' }],
    })

    expect(result.totalProjectedPoints).toBe(9.2)
    expect(result.unfilledSlots.map((slot) => slot.slotCode)).toEqual(['GKP'])

    const explanation = await explainOptimizedLineup({ result, useAI: false })
    expect(explanation.source).toBe('deterministic')
    expect(explanation.summary).toContain('9.2')
  })
})
