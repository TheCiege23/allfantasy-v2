import { describe, expect, it } from 'vitest'
import { validateRosterConfig } from '@/lib/roster-engine'
import type { RosterSlotDefinition } from '@/lib/roster-engine'

const nflDefs: RosterSlotDefinition[] = [
  { key: 'QB', label: 'Quarterback', shortLabel: 'QB', color: '#fff', category: 'offense', defaultCount: 1, minCount: 0, maxCount: 4 },
  { key: 'RB', label: 'Running Back', shortLabel: 'RB', color: '#fff', category: 'offense', defaultCount: 2, minCount: 0, maxCount: 6 },
  { key: 'SUPERFLEX', label: 'Superflex', shortLabel: 'SF', color: '#fff', category: 'flex', defaultCount: 0, minCount: 0, maxCount: 2 },
  { key: 'BN', label: 'Bench', shortLabel: 'BN', color: '#fff', category: 'bench', defaultCount: 5, minCount: 0, maxCount: 20 },
]

describe('roster-engine validation', () => {
  it('rejects empty roster configs', () => {
    const result = validateRosterConfig('NFL', 'redraft', {}, nflDefs)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Roster cannot be empty.')
    expect(result.errors).toContain('Starter count cannot be zero.')
  })

  it('enforces slot min/max and flags unknown slots', () => {
    const result = validateRosterConfig('NFL', 'redraft', { QB: 5, RB: -1, X_SLOT: 1 }, nflDefs)
    expect(result.valid).toBe(false)
    expect(result.errors.some((error) => error.includes('Quarterback exceeds maximum'))).toBe(true)
    expect(result.errors.some((error) => error.includes('Running Back is below minimum'))).toBe(true)
    expect(result.warnings).toContain('Unknown slot X_SLOT is present in config.')
  })

  it('adds superflex scarcity warning when QB is undersized', () => {
    const result = validateRosterConfig('NFL', 'redraft', { QB: 1, RB: 2, SUPERFLEX: 1, BN: 5 }, nflDefs)
    expect(result.valid).toBe(true)
    expect(result.warnings).toContain(
      'Superflex is enabled with fewer than 2 QB slots; league may experience QB scarcity.',
    )
  })
})
