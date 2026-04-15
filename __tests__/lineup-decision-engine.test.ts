import { describe, expect, it } from 'vitest'
import { buildPremiumLineupDecision, isZeroParticipationWithSignals } from '@/lib/lineup-decision-engine'

describe('Premium lineup decision engine', () => {
  it('returns strict JSON with Weekly Start Score fields', () => {
    const { json, legacyResult } = buildPremiumLineupDecision({
      sport: 'NFL',
      lineupMode: 'Best Lineup',
      players: [
        { name: 'QB A', positions: ['QB'], projectedPoints: 22 },
        { name: 'RB A', positions: ['RB'], projectedPoints: 16 },
        { name: 'RB B', positions: ['RB'], projectedPoints: 14 },
        { name: 'WR A', positions: ['WR'], projectedPoints: 15 },
      ],
      slots: [{ code: 'QB' }, { code: 'RB' }, { code: 'FLEX' }],
      teamContext: { projectedWinProbability: 0.55, teamDirection: 'favorite' },
    })

    expect(json.lineupMode).toBe('Best Lineup')
    expect(json.optimizedLineup.length).toBe(3)
    expect(json.optimizedLineup[0].weeklyStartScore).toBeGreaterThan(0)
    expect(legacyResult.totalProjectedPoints).toBeGreaterThan(0)
    expect(json.autoSubRules.injuryOnly).toBe(true)
  })

  it('does not auto-sub Questionable without confirmation', () => {
    expect(isZeroParticipationWithSignals('Questionable')).toBe(false)
    expect(isZeroParticipationWithSignals('Out')).toBe(true)
    expect(isZeroParticipationWithSignals('Doubtful', { willNotPlayConfirmed: true })).toBe(true)
  })
})
