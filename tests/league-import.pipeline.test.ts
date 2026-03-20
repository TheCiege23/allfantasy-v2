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

const minimalFantraxPayload = {
  sourceInput: 'id:test-fantrax-id',
  league: {
    leagueId: 'fantrax-league-id',
    name: 'Fantrax Test League',
    sport: 'NCAAF',
    season: 2025,
    size: 12,
    currentWeek: 3,
    isFinished: false,
    url: null,
    isDevy: true,
  },
  settings: {
    scoringType: 'devy',
    rosterPositions: [
      { position: 'QB', count: 1 },
      { position: 'RB', count: 2 },
    ],
    scoringRules: [],
    raw: { importedFrom: 'legacy' },
  },
  teams: [
    {
      teamId: 'fantrax-team:one',
      managerId: 'fantrax-manager:one',
      managerName: 'Manager One',
      teamName: 'Team One',
      logoUrl: null,
      wins: 2,
      losses: 1,
      ties: 0,
      rank: 1,
      pointsFor: 321.5,
      pointsAgainst: 289.1,
      faabRemaining: null,
      waiverPriority: null,
      rosterPlayerIds: ['f1'],
      starterPlayerIds: [],
      reservePlayerIds: ['f1'],
      playerMap: {
        f1: { name: 'Player F One', position: 'RB', team: 'NIL' },
      },
    },
  ],
  schedule: [
    {
      week: 1,
      season: 2025,
      matchups: [
        {
          teamId1: 'fantrax-team:one',
          teamId2: 'fantrax-team:two',
          points1: 111.2,
          points2: 109.4,
        },
      ],
    },
  ],
  transactions: [
    {
      transactionId: 't1',
      type: 'trade',
      status: 'completed',
      createdAt: new Date().toISOString(),
      teamIds: ['fantrax-team:one', 'fantrax-team:two'],
      adds: { f2: 'fantrax-team:one' },
      drops: { f1: 'fantrax-team:one' },
      isDraftPick: false,
      pickRound: null,
      pickNumber: null,
      playerId: 'f2',
      playerName: 'Player F Two',
      position: 'WR',
      team: 'NIL',
    },
  ],
  draftPicks: [
    {
      round: 1,
      pickNumber: 4,
      teamId: 'fantrax-team:one',
      playerId: 'fantrax-draft-pick:r1:p4',
      playerName: 'Draft Pick R1P4',
      position: null,
      team: null,
    },
  ],
  playerMap: {
    f1: { name: 'Player F One', position: 'RB', team: 'NIL' },
  },
  previousSeasons: [
    { season: '2024', sourceLeagueId: 'fantrax-2024' },
  ],
}

const richSleeperPayload = {
  league: {
    league_id: 'rich-league-id',
    name: 'Rich Sleeper League',
    sport: 'nfl',
    season: '2025',
    total_rosters: 2,
    settings: { type: 2, playoff_teams: 4 },
    scoring_settings: { rec: 1, pass_yd: 0.04 },
    roster_positions: ['QB', 'RB', 'WR', 'TE', 'FLEX'],
    avatar: 'league-avatar',
  },
  users: [
    { user_id: 'u1', username: 'alpha', display_name: 'Alpha', avatar: 'u1-avatar' },
    { user_id: 'u2', username: 'beta', display_name: 'Beta', avatar: 'u2-avatar' },
  ],
  rosters: [
    {
      roster_id: 1,
      owner_id: 'u1',
      players: ['p1', 'p2'],
      starters: ['p1'],
      settings: { wins: 8, losses: 2, ties: 0, fpts: 1234, fpts_decimal: 56 },
    },
    {
      roster_id: 2,
      owner_id: 'u2',
      players: ['p3', 'p4'],
      starters: ['p3'],
      settings: { wins: 5, losses: 5, ties: 0, fpts: 1100, fpts_decimal: 10 },
    },
  ],
  matchupsByWeek: [
    {
      week: 1,
      matchups: [
        { roster_id: 1, matchup_id: 1, points: 105.5 },
        { roster_id: 2, matchup_id: 1, points: 99.1 },
      ],
    },
  ],
  transactions: [
    {
      transaction_id: 'tx-1',
      type: 'trade',
      status: 'complete',
      created: 1700000000000,
      adds: { p5: '1' },
      drops: { p2: '1' },
      roster_ids: [1, 2],
      draft_picks: [{ season: '2026', round: 1 }],
    },
  ],
  draftPicks: [
    {
      round: 1,
      roster_id: 1,
      player_id: 'p1',
      pick_no: 1,
      season: '2025',
      draft_id: 'draft-1',
      metadata: { first_name: 'Pat', last_name: 'Player', position: 'QB', team: 'KC' },
    },
  ],
  playerMap: {
    p1: { name: 'Pat Player', position: 'QB', team: 'KC' },
    p2: { name: 'Ron Runner', position: 'RB', team: 'SF' },
  },
  previousSeasons: [
    {
      season: '2024',
      league: {
        league_id: 'rich-league-id-2024',
        name: 'Rich Sleeper League 2024',
        sport: 'nfl',
        season: '2024',
        total_rosters: 2,
      },
    },
  ],
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
    expect(hasFullAdapter('fantrax')).toBe(true)
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

  it('normalizes rich Sleeper history, branding, and source tracking', async () => {
    const result = await runImportNormalizationPipeline({
      provider: 'sleeper',
      raw: richSleeperPayload,
    })

    expect(result.source.source_provider).toBe('sleeper')
    expect(result.source.source_league_id).toBe('rich-league-id')
    expect(result.source.source_season_id).toBe('2025')
    expect(result.source.import_batch_id).toContain('sleeper-rich-league-id')

    expect(result.league.name).toBe('Rich Sleeper League')
    expect(result.league.sport).toBe('NFL')
    expect(result.league.leagueSize).toBe(2)
    expect(result.league.isDynasty).toBe(true)
    expect(result.league_branding?.avatar_url).toContain('league-avatar')

    expect(result.rosters).toHaveLength(2)
    expect(result.standings).toHaveLength(2)
    expect(result.schedule).toHaveLength(1)
    expect(result.draft_picks).toHaveLength(1)
    expect(result.transactions).toHaveLength(1)
    expect(result.previous_seasons).toEqual([
      { season: '2024', source_league_id: 'rich-league-id-2024' },
    ])
    expect(result.transactions[0].type).toBe('trade')
    expect(result.draft_picks[0].player_name).toBe('Pat Player')
  })

  it('throws for unsupported provider', async () => {
    await expect(
      runImportNormalizationPipeline({ provider: 'unknown', raw: {} })
    ).rejects.toThrow(/Unsupported import provider/)
  })

  it('normalizes fantrax payload via dedicated adapter', async () => {
    const result = await runImportNormalizationPipeline({
      provider: 'fantrax',
      raw: minimalFantraxPayload,
    })
    expect(result.source.source_provider).toBe('fantrax')
    expect(result.league.name).toBe('Fantrax Test League')
    expect(result.league.sport).toBe('NCAAF')
    expect(result.rosters).toHaveLength(1)
    expect(result.schedule).toHaveLength(1)
    expect(result.transactions).toHaveLength(1)
    expect(result.identity_mappings?.length ?? 0).toBeGreaterThan(0)
  })
})
