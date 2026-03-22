import { describe, expect, it } from 'vitest'
import {
  getLeagueVariantLabel,
  getLockedVariantForLeagueType,
  resolveCreationVariantOrDefault,
  resolveEffectiveLeagueVariant,
} from '@/lib/league-creation/LeagueVariantResolver'

describe('LeagueVariantResolver', () => {
  it('maps NFL dynasty + IDP to DYNASTY_IDP', () => {
    const resolved = resolveEffectiveLeagueVariant({
      sport: 'NFL',
      leagueType: 'dynasty',
      requestedVariant: 'IDP',
    })
    expect(resolved.variant).toBe('DYNASTY_IDP')
    expect(resolved.variantLockedByLeagueType).toBe(false)
  })

  it('maps NFL redraft + DYNASTY_IDP to IDP', () => {
    const resolved = resolveEffectiveLeagueVariant({
      sport: 'NFL',
      leagueType: 'redraft',
      requestedVariant: 'DYNASTY_IDP',
    })
    expect(resolved.variant).toBe('IDP')
  })

  it('locks Devy league type to devy_dynasty', () => {
    expect(getLockedVariantForLeagueType('devy')).toBe('devy_dynasty')
    const resolved = resolveEffectiveLeagueVariant({
      sport: 'NFL',
      leagueType: 'devy',
      requestedVariant: 'PPR',
    })
    expect(resolved.variant).toBe('devy_dynasty')
    expect(resolved.variantLockedByLeagueType).toBe(true)
  })

  it('locks C2C league type to merged_devy_c2c', () => {
    const resolved = resolveEffectiveLeagueVariant({
      sport: 'NBA',
      leagueType: 'c2c',
      requestedVariant: 'STANDARD',
    })
    expect(resolved.variant).toBe('merged_devy_c2c')
    expect(resolved.variantLockedByLeagueType).toBe(true)
  })

  it('returns STANDARD fallback for creation payload when variant is absent', () => {
    const resolved = resolveCreationVariantOrDefault({
      sport: 'SOCCER',
      leagueType: 'redraft',
      requestedVariant: null,
    })
    expect(resolved).toBe('STANDARD')
  })

  it('provides stable UI labels for canonical variants', () => {
    expect(getLeagueVariantLabel('DYNASTY_IDP')).toBe('Dynasty IDP')
    expect(getLeagueVariantLabel('devy_dynasty')).toBe('Devy Dynasty')
    expect(getLeagueVariantLabel('merged_devy_c2c')).toBe('Merged Devy C2C')
  })
})
