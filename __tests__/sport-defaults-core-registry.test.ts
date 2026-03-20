import { describe, expect, it } from 'vitest'
import { getTeamMetadataDefaults } from '@/lib/sport-defaults/SportDefaultsRegistry'
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
})
