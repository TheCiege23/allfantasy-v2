/**
 * Phase 3 — DraftPlayerSearchResolver canonical-aware filterBySearch.
 *
 * Earlier behavior: "AJ Brown" (no dots) failed to match pool name "A.J. Brown"
 * because filterBySearch did a raw lowercase substring match. This test pins
 * the canonical fallback so dotless / apostropheless searches still hit.
 */

import { describe, expect, it } from 'vitest'
import { filterBySearch, type DraftPlayer } from '../../lib/draft-room/DraftPlayerSearchResolver'

const POOL: DraftPlayer[] = [
  { name: 'A.J. Brown', position: 'WR', team: 'PHI' },
  { name: "Ja'Marr Chase", position: 'WR', team: 'CIN' },
  { name: 'Marvin Harrison Jr.', position: 'WR', team: 'ARI' },
  { name: 'Marvin Harrison', position: 'WR', team: 'ARI' },
  { name: "De'Von Achane", position: 'RB', team: 'MIA' },
  { name: 'Saquon Barkley', position: 'RB', team: 'PHI' },
]

describe('filterBySearch canonical-aware match', () => {
  it('exact dotted query still works (legacy path)', () => {
    const out = filterBySearch(POOL, 'A.J. Brown')
    expect(out.map((p) => p.name)).toContain('A.J. Brown')
  })

  it('dotless query matches dotted name', () => {
    const out = filterBySearch(POOL, 'AJ Brown')
    expect(out.map((p) => p.name)).toContain('A.J. Brown')
  })

  it('lowercase + dotless matches', () => {
    const out = filterBySearch(POOL, 'aj brown')
    expect(out.map((p) => p.name)).toContain('A.J. Brown')
  })

  it("apostrophe-less query matches Ja'Marr Chase", () => {
    const out = filterBySearch(POOL, 'jamarr chase')
    expect(out.map((p) => p.name)).toContain("Ja'Marr Chase")
  })

  it("apostrophe-less query matches De'Von Achane", () => {
    const out = filterBySearch(POOL, 'devon achane')
    expect(out.map((p) => p.name)).toContain("De'Von Achane")
  })

  it('search "Marvin Harrison Jr" matches the SON, not just the father', () => {
    const out = filterBySearch(POOL, 'Marvin Harrison Jr')
    const names = out.map((p) => p.name)
    expect(names).toContain('Marvin Harrison Jr.')
  })

  it('search "Marvin Harrison" (without suffix) matches BOTH father and son (substring)', () => {
    // "marvin harrison" is a substring of both "marvin harrison" and "marvin harrison jr".
    // The user can disambiguate by clicking. This is intentional.
    const out = filterBySearch(POOL, 'Marvin Harrison')
    const names = out.map((p) => p.name)
    expect(names).toContain('Marvin Harrison Jr.')
    expect(names).toContain('Marvin Harrison')
  })

  it('team and position substrings still work', () => {
    expect(filterBySearch(POOL, 'PHI').map((p) => p.name).sort()).toEqual(
      ['A.J. Brown', 'Saquon Barkley'].sort(),
    )
    expect(filterBySearch(POOL, 'WR').length).toBeGreaterThanOrEqual(4)
  })

  it('empty query returns all players', () => {
    expect(filterBySearch(POOL, '')).toEqual(POOL)
    expect(filterBySearch(POOL, '   ')).toEqual(POOL)
  })

  it('non-matching query returns empty', () => {
    expect(filterBySearch(POOL, 'zzzznotaplayer')).toEqual([])
  })
})
