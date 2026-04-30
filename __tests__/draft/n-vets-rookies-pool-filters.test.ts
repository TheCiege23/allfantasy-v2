/**
 * Vets / Rookies pool filter predicates — unit tests (Commit N).
 *
 * Pure logic tests on `isVetEligibleForFilter` and the rookies/vets
 * mutual-exclusion contract. The rookies predicate is already locked by
 * `__tests__/draft/d7-rookie-filter.test.ts`; this file only adds
 * coverage for the new vets predicate plus the mutual-exclusion semantics
 * the PlayerPanel toggle handlers enforce.
 */

import { describe, expect, it } from 'vitest'
import {
  isRookieEligibleForFilter,
  isVetEligibleForFilter,
} from '@/lib/draft-room/rookieFilterPredicate'

describe('isVetEligibleForFilter — Commit N evidence-required predicate', () => {
  it('NFL veteran (yearsExp=1) → included', () => {
    expect(isVetEligibleForFilter({ yearsExp: 1 })).toBe(true)
  })

  it('NFL veteran (yearsExp=8) → included', () => {
    expect(isVetEligibleForFilter({ yearsExp: 8 })).toBe(true)
  })

  it('NFL rookie (yearsExp=0) → excluded', () => {
    expect(isVetEligibleForFilter({ yearsExp: 0 })).toBe(false)
  })

  it('explicit isRookie=true beats yearsExp ≥ 1 (promoted devy in first NFL season is still a rookie)', () => {
    expect(isVetEligibleForFilter({ isRookie: true, yearsExp: 0 })).toBe(false)
    // Edge case — a row with both isRookie=true AND yearsExp=2 should still
    // be excluded from vets-only. Server data inconsistency shouldn't put
    // someone in both buckets.
    expect(isVetEligibleForFilter({ isRookie: true, yearsExp: 2 })).toBe(false)
  })

  it('graduated devy without yearsExp → included (former college player who has played a pro season)', () => {
    expect(isVetEligibleForFilter({ isDevy: true, graduatedToNFL: true })).toBe(true)
  })

  it('non-graduated devy without yearsExp → excluded (still a college player)', () => {
    expect(isVetEligibleForFilter({ isDevy: true, graduatedToNFL: false })).toBe(false)
  })

  it('row missing all metadata → excluded (empty-state will surface "Vet data unavailable")', () => {
    expect(isVetEligibleForFilter({})).toBe(false)
  })

  it('row with explicit yearsExp=null → excluded (data unavailable, not zero)', () => {
    expect(isVetEligibleForFilter({ yearsExp: null })).toBe(false)
  })

  it('row with NaN yearsExp (corrupt upstream) → excluded', () => {
    expect(isVetEligibleForFilter({ yearsExp: Number.NaN })).toBe(false)
  })
})

describe('Vets / Rookies mutual exclusion across a realistic NFL redraft pool', () => {
  const pool = [
    { name: 'Ashton Jeanty', position: 'RB', team: 'LV', yearsExp: 0 },
    { name: 'Tetairoa McMillan', position: 'WR', team: 'CAR', yearsExp: 0 },
    { name: 'Cameron Ward', position: 'QB', team: 'TEN', yearsExp: 0 },
    { name: "Ja'Marr Chase", position: 'WR', team: 'CIN', yearsExp: 4 },
    { name: 'Saquon Barkley', position: 'RB', team: 'PHI', yearsExp: 7 },
    { name: 'Mystery Free Agent', position: 'WR', team: null /* no yearsExp */ },
  ] as const

  it('every player in the pool is at most one of: rookie, vet, unknown', () => {
    for (const p of pool) {
      const isRookie = isRookieEligibleForFilter(p)
      const isVet = isVetEligibleForFilter(p)
      expect(isRookie && isVet).toBe(false)
    }
  })

  it('rookies-only and vets-only return disjoint sets', () => {
    const rookies = pool.filter((p) => isRookieEligibleForFilter(p))
    const vets = pool.filter((p) => isVetEligibleForFilter(p))
    const intersection = rookies.filter((r) => vets.includes(r as (typeof vets)[number]))
    expect(intersection).toHaveLength(0)
  })

  it('rookies + vets do NOT necessarily cover the whole pool — unknown rows are excluded from both', () => {
    const rookies = pool.filter((p) => isRookieEligibleForFilter(p))
    const vets = pool.filter((p) => isVetEligibleForFilter(p))
    // 3 rookies + 2 vets = 5; pool has 6 (Mystery Free Agent has no metadata).
    expect(rookies.length + vets.length).toBe(pool.length - 1)
  })

  it('combining vets-only with a position filter returns only the vet RBs', () => {
    const filtered = pool
      .filter((p) => p.position === 'RB')
      .filter((p) => isVetEligibleForFilter(p))
    expect(filtered.map((p) => p.name)).toEqual(['Saquon Barkley'])
  })

  it('combining vets-only with a name search returns the matching vet', () => {
    const q = 'chase'
    const filtered = pool
      .filter((p) => isVetEligibleForFilter(p))
      .filter((p) => p.name.toLowerCase().includes(q))
    expect(filtered.map((p) => p.name)).toEqual(["Ja'Marr Chase"])
  })

  it('vets-only correctly excludes Mystery Free Agent (no yearsExp metadata)', () => {
    expect(isVetEligibleForFilter({ name: 'Mystery Free Agent' } as any)).toBe(false)
  })
})

describe('Vets predicate respects devy graduation state', () => {
  it('graduated devy with yearsExp=2 → vet (yearsExp wins)', () => {
    expect(isVetEligibleForFilter({ isDevy: true, graduatedToNFL: true, yearsExp: 2 })).toBe(true)
  })

  it('non-graduated devy with no yearsExp → not a vet', () => {
    expect(isVetEligibleForFilter({ isDevy: true, graduatedToNFL: false })).toBe(false)
  })

  it('graduated devy who is still a rookie season (yearsExp=0, isRookie=true) → not a vet', () => {
    expect(
      isVetEligibleForFilter({ isDevy: true, graduatedToNFL: true, yearsExp: 0, isRookie: true }),
    ).toBe(false)
  })
})
