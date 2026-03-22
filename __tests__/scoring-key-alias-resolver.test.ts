import { describe, expect, it } from 'vitest'
import { normalizeScoringStatKey } from '@/lib/scoring-defaults/ScoringKeyAliasResolver'

describe('ScoringKeyAliasResolver', () => {
  it('maps legacy unambiguous IDP keys to canonical keys', () => {
    expect(normalizeScoringStatKey('solo_tackle')).toBe('idp_solo_tackle')
    expect(normalizeScoringStatKey('assist_tackle')).toBe('idp_assist_tackle')
    expect(normalizeScoringStatKey('defensive_touchdown')).toBe('idp_defensive_touchdown')
  })

  it('maps contextual IDP keys when template expects idp-prefixed key', () => {
    const templateRuleKeys = ['idp_sack', 'idp_interception', 'passing_td']
    expect(
      normalizeScoringStatKey('sack', { sportType: 'NFL', templateRuleKeys })
    ).toBe('idp_sack')
    expect(
      normalizeScoringStatKey('interception', { sportType: 'NFL', templateRuleKeys })
    ).toBe('idp_interception')
  })

  it('does not remap ambiguous keys outside IDP template context', () => {
    const templateRuleKeys = ['dst_sack', 'interception', 'passing_td']
    expect(
      normalizeScoringStatKey('sack', { sportType: 'NFL', templateRuleKeys })
    ).toBe('sack')
    expect(
      normalizeScoringStatKey('interception', { sportType: 'NFL', templateRuleKeys })
    ).toBe('interception')
  })

  it('returns lowercased key for unknown stat aliases', () => {
    expect(normalizeScoringStatKey('minutes_played')).toBe('minutes_played')
    expect(normalizeScoringStatKey('SOME_NEW_STAT')).toBe('some_new_stat')
  })
})

