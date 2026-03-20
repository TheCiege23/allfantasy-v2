import { describe, expect, it } from 'vitest'
import { DefaultExternalIdentityMapper } from '../lib/league-import/mappers/DefaultExternalIdentityMapper'

describe('DefaultExternalIdentityMapper', () => {
  it('builds stable league/team/manager/player identity mappings', () => {
    const mappings = DefaultExternalIdentityMapper.buildMappings?.('sleeper', {
      source: {
        source_provider: 'sleeper',
        source_league_id: '123',
        imported_at: new Date().toISOString(),
      },
      rosters: [
        {
          source_team_id: '1',
          source_manager_id: 'u1',
          owner_name: 'Owner One',
          team_name: 'Team One',
          avatar_url: null,
          wins: 1,
          losses: 0,
          ties: 0,
          points_for: 100,
          player_ids: ['p1'],
          starter_ids: ['p1'],
        },
      ],
      player_map: {
        p1: { name: 'Player One', position: 'QB', team: 'KC' },
      },
    })

    expect(mappings).toBeDefined()
    expect(mappings?.find((mapping) => mapping.entity_type === 'league')?.stable_key).toBe('sleeper:league:123')
    expect(mappings?.find((mapping) => mapping.entity_type === 'team')?.stable_key).toBe('sleeper:team:1')
    expect(mappings?.find((mapping) => mapping.entity_type === 'manager')?.stable_key).toBe('sleeper:manager:u1')
    expect(mappings?.find((mapping) => mapping.entity_type === 'player')?.stable_key).toBe('sleeper:player:p1')
  })
})
