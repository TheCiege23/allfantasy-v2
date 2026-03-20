import { describe, expect, it } from 'vitest'
import {
  getSupportedSportDefaultsSports,
  getTeamMetadataDefaults,
} from '@/lib/sport-defaults/SportDefaultsRegistry'
import { resolveSportDefaults } from '@/lib/sport-defaults/SportDefaultsResolver'

describe('Sport Defaults Core Registry', () => {
  it('returns non-empty team metadata with logos for NFL', () => {
    const teamMeta = getTeamMetadataDefaults('NFL')

    expect(teamMeta.sport_type).toBe('NFL')
    expect(teamMeta.teams.length).toBeGreaterThan(0)
    expect(teamMeta.teams.some((team) => team.abbreviation === 'KC')).toBe(true)
    expect(teamMeta.teams.every((team) => team.primary_logo !== null)).toBe(true)
  })

  it('resolves full sport defaults including team metadata for soccer', () => {
    const defaults = resolveSportDefaults('SOCCER')

    expect(defaults.metadata.sport_type).toBe('SOCCER')
    expect(defaults.teamMetadata).not.toBeNull()
    expect(defaults.teamMetadata?.teams.length).toBeGreaterThan(0)
    expect(defaults.teamMetadata?.teams.some((team) => team.abbreviation === 'MIA')).toBe(true)
  })

  it('includes required sports and enriched metadata fields in core registry', () => {
    const supported = getSupportedSportDefaultsSports()
    expect(supported).toEqual(expect.arrayContaining(['NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB']))

    const nbaDefaults = resolveSportDefaults('NBA')
    expect(nbaDefaults.metadata.default_season_type).toBe('regular')
    expect(nbaDefaults.metadata.player_pool_source).toBe('sports_player')
    expect(nbaDefaults.metadata.display_labels?.roster).toBeTruthy()
  })
})
