import { describe, it, expect } from 'vitest'
import {
  normalizedPlayerValue,
  normalizedPickValue,
  normalizedFaabValue,
  scarcityFor,
  FAAB_VALUE_PER_DOLLAR,
} from '@/lib/trade-value/valueEngine'
import { buildTeamProfile } from '@/lib/trade-value/teamProfile'
import { gradeTrade } from '@/lib/trade-value/grader'
import { buildTradeValueSnapshot } from '@/lib/trade-value/snapshot'
import type { SideTotals } from '@/lib/trade-value/types'

describe('valueEngine', () => {
  it('is deterministic and monotonic in projection', () => {
    const lo = normalizedPlayerValue({ projection: 100, position: 'WR' })
    const hi = normalizedPlayerValue({ projection: 250, position: 'WR' })
    expect(hi).toBeGreaterThan(lo)
    expect(normalizedPlayerValue({ projection: 250, position: 'WR' })).toBe(hi) // stable
  })

  it('applies positional scarcity (RB premium over QB at equal projection)', () => {
    expect(scarcityFor('RB')).toBeGreaterThan(scarcityFor('QB'))
    const rb = normalizedPlayerValue({ projection: 200, position: 'RB' })
    const qb = normalizedPlayerValue({ projection: 200, position: 'QB' })
    expect(rb).toBeGreaterThan(qb)
  })

  it('gives a small premium for lower ADP and clamps to 0..10000', () => {
    const early = normalizedPlayerValue({ projection: 150, adp: 5, position: 'WR' })
    const late = normalizedPlayerValue({ projection: 150, adp: 200, position: 'WR' })
    expect(early).toBeGreaterThan(late)
    expect(normalizedPlayerValue({ projection: 9999, position: 'RB' })).toBe(10000)
    expect(normalizedPlayerValue({ projection: 0, position: 'WR' })).toBeGreaterThanOrEqual(0)
  })

  it('values picks by round with future-season discount', () => {
    expect(normalizedPickValue({ round: 1 })).toBeGreaterThan(normalizedPickValue({ round: 3 }))
    const now = normalizedPickValue({ round: 1, pickSeason: 2026, currentSeason: 2026 })
    const future = normalizedPickValue({ round: 1, pickSeason: 2028, currentSeason: 2026 })
    expect(future).toBeLessThan(now)
  })

  it('values FAAB linearly', () => {
    expect(normalizedFaabValue(10)).toBe(10 * FAAB_VALUE_PER_DOLLAR)
    expect(normalizedFaabValue(0)).toBe(0)
  })
})

describe('teamProfile', () => {
  it('classifies a winning top-seed team as contender', () => {
    const p = buildTeamProfile({ rosterId: 'r1', wins: 8, losses: 2, pointsFor: 1200, playoffSeed: 1, leagueSize: 12, positions: ['QB', 'RB', 'RB', 'WR', 'WR', 'TE'] })
    expect(p.stance).toBe('contender')
  })
  it('classifies a losing team as rebuilder and flags depth issues', () => {
    const p = buildTeamProfile({ rosterId: 'r2', wins: 2, losses: 8, pointsFor: 800, playoffSeed: 11, leagueSize: 12, positions: ['QB', 'WR'] })
    expect(p.stance).toBe('rebuilder')
    expect(p.weakPositions).toContain('RB')
    expect(p.depthIssues).toBe(true)
  })
})

const side = (rosterId: string, vals: number[]): SideTotals => ({
  rosterId,
  total: vals.reduce((s, v) => s + v, 0),
  assets: vals.map((v, i) => ({
    kind: 'player', fromRosterId: rosterId, toRosterId: 'other', playerId: `p${i}`, position: 'WR',
    sources: { projectionValue: 100, rankingValue: null, adpValue: null, fantasyCalcValue: null },
    internalValue: v,
  })),
})

describe('grader', () => {
  it('grades an even trade high with a within-market bullet', () => {
    const { grade } = gradeTrade(side('a', [5000]), side('b', [4900]))
    expect(grade.fairnessScore).toBeGreaterThanOrEqual(95)
    expect(['A+', 'A']).toContain(grade.grade)
    expect(grade.bullets.join(' ')).toMatch(/normal market range/i)
  })

  it('grades a lopsided trade low and flags commissioner review', () => {
    const { grade, commissionerReview } = gradeTrade(side('a', [9000]), side('b', [1000]))
    expect(grade.fairnessScore).toBeLessThan(40)
    expect(grade.grade).toBe('F')
    expect(commissionerReview.lopsided).toBe(true)
    expect(commissionerReview.reviewRecommended).toBe(true)
    expect(grade.bullets.join(' ')).toMatch(/significantly uneven/i)
  })
})

describe('snapshot', () => {
  it('builds a two-sided snapshot with totals + grade and is deterministic', () => {
    const snap = buildTradeValueSnapshot({
      proposerRosterId: 'A',
      receiverRosterId: 'B',
      currentSeason: 2026,
      context: { sport: 'NFL', leagueType: 'redraft', scoring: 'ppr', rosterFormat: 'standard', capturedAt: '2026-06-21T00:00:00Z' },
      assets: [
        { kind: 'player', fromRosterId: 'A', toRosterId: 'B', playerId: 'x', position: 'RB', sources: { projectionValue: 220, rankingValue: null, adpValue: 12, fantasyCalcValue: null } },
        { kind: 'faab', fromRosterId: 'B', toRosterId: 'A', faabAmount: 20, sources: { projectionValue: null, rankingValue: null, adpValue: null, fantasyCalcValue: null } },
      ],
    })
    expect(snap.sides).toHaveLength(2)
    expect(snap.sides[0]!.rosterId).toBe('A')
    expect(snap.sides[0]!.total).toBeGreaterThan(0)
    expect(snap.sides[1]!.total).toBe(20 * FAAB_VALUE_PER_DOLLAR)
    expect(typeof snap.grade.grade).toBe('string')
    // determinism
    const again = buildTradeValueSnapshot({
      proposerRosterId: 'A', receiverRosterId: 'B', currentSeason: 2026,
      context: { sport: 'NFL', leagueType: 'redraft', scoring: 'ppr', rosterFormat: 'standard', capturedAt: '2026-06-21T00:00:00Z' },
      assets: [
        { kind: 'player', fromRosterId: 'A', toRosterId: 'B', playerId: 'x', position: 'RB', sources: { projectionValue: 220, rankingValue: null, adpValue: 12, fantasyCalcValue: null } },
        { kind: 'faab', fromRosterId: 'B', toRosterId: 'A', faabAmount: 20, sources: { projectionValue: null, rankingValue: null, adpValue: null, fantasyCalcValue: null } },
      ],
    })
    expect(again.sides[0]!.total).toBe(snap.sides[0]!.total)
  })
})
