import { describe, expect, it } from 'vitest'
import {
  clampLegacyLeagueSize,
  finalizeCanonicalCreatePayload,
  normalizeLegacyManualCreateBody,
  normalizeQuickLeagueType,
  sanitizeLeagueVariantAgainstScoring,
} from '@/lib/league-creation/normalizeCreateLeaguePayload'

describe('normalizeLegacyManualCreateBody', () => {
  it('Quick Create Redraft normalizes to concept redraft', () => {
    const n = normalizeLegacyManualCreateBody({
      name: 'Test League',
      sport: 'NFL',
      leagueType: 'redraft',
      draftType: 'snake',
      leagueSize: 12,
      scoring: 'HALF_PPR',
      isDynasty: false,
      isSuperflex: false,
      platform: 'manual',
      settings: {},
    })
    expect(n.leagueType).toBe('redraft')
    expect(n.isDynasty).toBe(false)
  })

  it('Quick Create Redraft PPR does not place PPR in leagueVariant', () => {
    const n = normalizeLegacyManualCreateBody({
      name: 'X',
      sport: 'NFL',
      leagueType: 'redraft',
      draftType: 'snake',
      leagueSize: 12,
      scoring: 'PPR',
      isDynasty: false,
      leagueVariant: 'PPR',
      platform: 'manual',
      settings: {},
    })
    expect(n.leagueVariant).toBeUndefined()
    expect(n.scoring).toBe('PPR')
  })

  it('Quick Create Dynasty normalizes to concept dynasty', () => {
    const n = normalizeLegacyManualCreateBody({
      name: 'Dyn',
      sport: 'NFL',
      leagueType: 'redraft',
      draftType: 'snake',
      leagueSize: 12,
      scoring: 'HALF_PPR',
      isDynasty: true,
      platform: 'manual',
      settings: {},
    })
    expect(n.leagueType).toBe('dynasty')
    expect(n.isDynasty).toBe(true)
  })

  it('Advanced-equivalent manual payload Redraft stays consistent with explicit type', () => {
    const n = normalizeLegacyManualCreateBody({
      name: 'Y',
      sport: 'NBA',
      leagueType: 'redraft',
      draftType: 'snake',
      teamCount: 10,
      scoring: 'POINTS',
      isDynasty: false,
      platform: 'manual',
      settings: {},
    })
    expect(n.leagueType).toBe('redraft')
    expect(n.leagueSize).toBe(10)
    expect(n.sport).toBe('NBA')
  })

  it('maps scoring labels without stuffing leagueVariant', () => {
    const n = normalizeLegacyManualCreateBody({
      name: 'Z',
      sport: 'NFL',
      leagueType: 'redraft',
      scoring: 'half_ppr',
      leagueVariant: 'half_ppr',
      platform: 'manual',
      settings: {},
    })
    expect(n.leagueVariant).toBeUndefined()
  })

  it('strips invalid leagueVariant scoring strings', () => {
    expect(sanitizeLeagueVariantAgainstScoring('PPR', 'FULL_PPR')).toBeUndefined()
    expect(sanitizeLeagueVariantAgainstScoring('std', 'standard')).toBeUndefined()
    expect(sanitizeLeagueVariantAgainstScoring('PPR', 'guillotine')).toBe('guillotine')
  })

  it('team count is numeric and clamped', () => {
    expect(clampLegacyLeagueSize('12')).toBe(12)
    expect(clampLegacyLeagueSize(2)).toBe(4)
    expect(clampLegacyLeagueSize(64)).toBe(32)
    const n = normalizeLegacyManualCreateBody({
      name: 'T',
      sport: 'NFL',
      leagueSize: 99,
      platform: 'manual',
      settings: {},
    })
    expect(n.leagueSize).toBe(32)
  })

  it('timezone defaults safely', () => {
    const n = normalizeLegacyManualCreateBody({
      name: 'Tz',
      sport: 'NFL',
      platform: 'manual',
      settings: {},
    })
    expect(n.settings.league_timezone).toBe('America/New_York')
  })

  it('keeper beats conflicting isDynasty for explicit concept', () => {
    const n = normalizeLegacyManualCreateBody({
      name: 'K',
      sport: 'NFL',
      leagueType: 'keeper',
      isDynasty: true,
      platform: 'manual',
      settings: {},
    })
    expect(n.leagueType).toBe('keeper')
    expect(n.isDynasty).toBe(false)
  })
})

describe('finalizeCanonicalCreatePayload', () => {
  it('fills missing timezone', () => {
    const out = finalizeCanonicalCreatePayload({ concept: 'redraft', timezone: '' })
    expect(out.timezone).toBe('America/New_York')
  })
})

describe('normalizeQuickLeagueType', () => {
  it('does not emit dynasty when keeper explicit', () => {
    expect(normalizeQuickLeagueType('keeper', true)).toBe('keeper')
  })
})
