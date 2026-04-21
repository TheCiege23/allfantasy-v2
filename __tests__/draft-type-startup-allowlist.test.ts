import { describe, expect, it } from 'vitest'

import {
  getAllowedDraftTypesForLeagueType,
  isDraftTypeAllowedForLeagueType,
} from '@/lib/league-creation-wizard/league-type-registry'

describe('startup draft type allowlist', () => {
  it('keeps redraft startup options to snake, linear, and auction', () => {
    const allowed = getAllowedDraftTypesForLeagueType('redraft', 'NFL')
    expect(allowed).toEqual(['snake', 'linear', 'auction'])
    expect(isDraftTypeAllowedForLeagueType('slow_draft', 'redraft', 'NFL')).toBe(false)
    expect(isDraftTypeAllowedForLeagueType('mock_draft', 'redraft', 'NFL')).toBe(false)
  })

  it('keeps C2C startup options to snake, linear, and auction variants', () => {
    const allowed = getAllowedDraftTypesForLeagueType('c2c', 'NFL')
    expect(allowed).toEqual(['c2c_snake', 'c2c_linear', 'c2c_auction'])
  })
})
