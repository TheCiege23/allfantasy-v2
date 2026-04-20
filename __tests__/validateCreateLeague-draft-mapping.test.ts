import { describe, expect, it } from 'vitest'

import { validateCreatePayload } from '@/lib/league-creation/canonical/validateCreateLeague'

const base = {
  sport: 'NFL' as const,
  teamCount: 12,
  scoringPreset: 'fb_half_ppr',
  leagueName: 'Mapped Draft Test',
}

describe('validateCreatePayload — devy/c2c draft id normalization', () => {
  it('accepts devy + snake (maps to devy_snake for format check)', () => {
    const r = validateCreatePayload({
      ...base,
      concept: 'devy',
      draftType: 'snake',
    })
    expect(r.ok).toBe(true)
  })

  it('accepts devy + auction (maps to devy_auction)', () => {
    const r = validateCreatePayload({
      ...base,
      concept: 'devy',
      draftType: 'auction',
    })
    expect(r.ok).toBe(true)
  })

  it('accepts devy + offline (execution mode; maps via normalizeDraftTypeForEngine to devy_snake)', () => {
    const r = validateCreatePayload({
      ...base,
      concept: 'devy',
      draftType: 'offline',
    })
    expect(r.ok).toBe(true)
  })

  it('accepts c2c + snake (maps to c2c_snake)', () => {
    const r = validateCreatePayload({
      ...base,
      concept: 'c2c',
      draftType: 'snake',
    })
    expect(r.ok).toBe(true)
  })

  it('accepts c2c + auction (maps to c2c_auction)', () => {
    const r = validateCreatePayload({
      ...base,
      concept: 'c2c',
      draftType: 'auction',
    })
    expect(r.ok).toBe(true)
  })

  it('accepts canonical devy_snake / devy_auction when sent explicitly', () => {
    expect(
      validateCreatePayload({
        ...base,
        concept: 'devy',
        draftType: 'devy_snake',
      }).ok,
    ).toBe(true)
    expect(
      validateCreatePayload({
        ...base,
        concept: 'devy',
        draftType: 'devy_auction',
      }).ok,
    ).toBe(true)
  })

  it('redraft + snake unchanged (no devy/c2c mapping)', () => {
    const r = validateCreatePayload({
      ...base,
      concept: 'redraft',
      draftType: 'snake',
    })
    expect(r.ok).toBe(true)
  })

  it('dynasty + snake unchanged', () => {
    const r = validateCreatePayload({
      ...base,
      concept: 'dynasty',
      draftType: 'snake',
    })
    expect(r.ok).toBe(true)
  })
})
