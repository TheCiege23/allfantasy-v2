import { describe, it, expect } from 'vitest'
import {
  runImportNormalizationPipeline,
  resolveProvider,
  getAdapter,
  getSupportedProviders,
  hasFullAdapter,
} from '../lib/league-import'

const minimalSleeperPayload = {
  league: {
    league_id: 'test-league-id',
    name: 'Test League',
    sport: 'nfl',
    season: '2024',
    total_rosters: 10,
    settings: { type: 1, playoff_teams: 4 },
    roster_positions: ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX'],
    scoring_settings: { rec: 1, pass_yd: 0.04 },
  },
  users: [{ user_id: 'u1', username: 'user1', display_name: 'User One', avatar: 'a1' }],
  rosters: [
    {
      roster_id: 1,
      owner_id: 'u1',
      players: ['p1', 'p2'],
      starters: ['p1'],
      settings: { wins: 5, losses: 4, fpts: 1000, fpts_decimal: 50 },
    },
  ],
  matchupsByWeek: [{ week: 1, matchups: [{ roster_id: 1, matchup_id: 1, points: 100 }, { roster_id: 2, matchup_id: 1, points: 90 }] }],
  transactions: [],
  draftPicks: [],
  playerMap: { p1: { name: 'Player One', position: 'QB', team: 'KC' } },
}

describe('ImportProviderResolver', () => {
  it('resolves sleeper', () => {
    expect(resolveProvider('sleeper')).toBe('sleeper')
    expect(resolveProvider('Sleeper')).toBe('sleeper')
  })
  it('resolves mfl aliases', () => {
    expect(resolveProvider('mfl')).toBe('mfl')
    expect(resolveProvider('myfantasyleague')).toBe('mfl')
  })
  it('returns null for unknown', () => {
    expect(resolveProvider('unknown')).toBeNull()
  })
})

describe('LeagueImportRegistry', () => {
  it('returns adapter for sleeper', () => {
    const adapter = getAdapter('sleeper')
    expect(adapter.provider).toBe('sleeper')
  })
  it('getSupportedProviders includes all five', () => {
    const providers = getSupportedProviders()
    expect(providers).toContain('sleeper')
    expect(providers).toContain('espn')
    expect(providers).toContain('yahoo')
    expect(providers).toContain('fantrax')
    expect(providers).toContain('mfl')
  })
  it('hasFullAdapter reflects the live provider-backed adapters', () => {
    expect(hasFullAdapter('sleeper')).toBe(true)
    expect(hasFullAdapter('espn')).toBe(true)
    expect(hasFullAdapter('yahoo')).toBe(true)
    expect(hasFullAdapter('mfl')).toBe(true)
    expect(hasFullAdapter('fantrax')).toBe(false)
  })
})

describe('ImportNormalizationPipeline', () => {
  it('normalizes minimal Sleeper payload', async () => {
    const result = await runImportNormalizationPipeline({
      provider: 'sleeper',
      raw: minimalSleeperPayload,
    })
    expect(result.source.source_provider).toBe('sleeper')
    expect(result.source.source_league_id).toBe('test-league-id')
    expect(result.league.name).toBe('Test League')
    expect(result.league.sport).toBe('NFL')
    expect(result.league.season).toBe(2024)
    expect(result.league.leagueSize).toBe(10)
    expect(result.league.isDynasty).toBe(false)
    expect(result.rosters).toHaveLength(1)
    expect(result.rosters[0].source_team_id).toBe('1')
    expect(result.rosters[0].owner_name).toBe('User One')
    expect(result.rosters[0].points_for).toBe(1000.5)
    expect(result.schedule).toHaveLength(1)
    expect(result.schedule[0].week).toBe(1)
    expect(result.schedule[0].matchups).toHaveLength(1)
    expect(result.player_map.p1?.name).toBe('Player One')
  })

  it('throws for unsupported provider', async () => {
    await expect(
      runImportNormalizationPipeline({ provider: 'unknown', raw: {} })
    ).rejects.toThrow(/Unsupported import provider/)
  })

  it('stub adapter returns valid result for fantrax', async () => {
    const result = await runImportNormalizationPipeline({
      provider: 'fantrax',
      raw: {},
    })
    expect(result.source.source_provider).toBe('fantrax')
    expect(result.league.name).toContain('FANTRAX')
    expect(result.rosters).toHaveLength(0)
  })
})
