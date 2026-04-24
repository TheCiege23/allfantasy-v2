import { describe, expect, it } from 'vitest'

import {
  draftPoolRowMatchesEligiblePositions,
  filterEntriesByDraftEligiblePositions,
} from '@/lib/draft-room/draft-pool-eligible-positions'

describe('filterEntriesByDraftEligiblePositions', () => {
  it('returns all entries when draftEligiblePositions is missing or empty', () => {
    const q = [
      { playerName: 'A', position: 'K' },
      { playerName: 'B', position: 'QB' },
    ]
    expect(filterEntriesByDraftEligiblePositions(q, null)).toEqual(q)
    expect(filterEntriesByDraftEligiblePositions(q, undefined)).toEqual(q)
    expect(filterEntriesByDraftEligiblePositions(q, new Set())).toEqual(q)
  })

  it('keeps order and drops positions not starter-eligible', () => {
    const eligible = new Set(['QB', 'RB', 'WR', 'TE', 'DST', 'K'])
    const q = [
      { playerName: 'Late QB', position: 'QB' },
      { playerName: 'Wrong', position: 'LB' },
      { playerName: 'RB1', position: 'RB' },
    ]
    expect(filterEntriesByDraftEligiblePositions(q, eligible)).toEqual([
      { playerName: 'Late QB', position: 'QB' },
      { playerName: 'RB1', position: 'RB' },
    ])
  })

  it('normalizes PK→K and DEF/DST like draftPoolRowMatchesEligiblePositions', () => {
    const eligible = new Set(['K', 'DST'])
    expect(draftPoolRowMatchesEligiblePositions('PK', eligible)).toBe(true)
    expect(draftPoolRowMatchesEligiblePositions('DEF', eligible)).toBe(true)
    const q = [
      { playerName: 'K1', position: 'PK' },
      { playerName: 'D1', position: 'DEF' },
    ]
    expect(filterEntriesByDraftEligiblePositions(q, eligible)).toEqual(q)
  })
})
