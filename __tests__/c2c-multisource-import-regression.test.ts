import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  executeCanonicalLeagueCreationMock,
  rosterCreateMock,
  c2CPlayerStateCreateManyMock,
  leagueFindUniqueMock,
  leagueUpdateMock,
} = vi.hoisted(() => ({
  executeCanonicalLeagueCreationMock: vi.fn(),
  rosterCreateMock: vi.fn(),
  c2CPlayerStateCreateManyMock: vi.fn(),
  leagueFindUniqueMock: vi.fn(),
  leagueUpdateMock: vi.fn(),
}))

vi.mock('@/lib/league-creation/canonical/executeCanonicalLeagueCreation', () => ({
  executeCanonicalLeagueCreation: executeCanonicalLeagueCreationMock,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    roster: {
      create: rosterCreateMock,
    },
    c2CPlayerState: {
      createMany: c2CPlayerStateCreateManyMock,
    },
    league: {
      findUnique: leagueFindUniqueMock,
      update: leagueUpdateMock,
    },
  },
}))

describe('C2C multi-source merge and commit', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    executeCanonicalLeagueCreationMock.mockResolvedValue({
      ok: true,
      response: {
        league: { id: 'league-c2c-import-1' },
      },
    })

    let rosterCall = 0
    rosterCreateMock.mockImplementation(async () => {
      rosterCall += 1
      return { id: `roster-${rosterCall}` }
    })

    c2CPlayerStateCreateManyMock.mockResolvedValue({ count: 4 })
    leagueFindUniqueMock.mockResolvedValue({ settings: { existing: true }, joinCode: 'JOIN1234' })
    leagueUpdateMock.mockResolvedValue({ id: 'league-c2c-import-1' })
  })

  it('merges pro+college sources and honors manual mapping overrides', async () => {
    const { mergeC2CSources } = await import('@/lib/league-import/c2cMultiSourceMerge')

    const result = mergeC2CSources({
      pro: {
        league: {
          source: 'sleeper',
          source_league_id: 'pro-l',
          name: 'Pro League',
          season: '2026',
          sport: 'NFL',
          scoring_type: 'PPR',
          roster_positions: ['QB', 'RB'],
          settings: {},
        },
        rosters: [
          {
            source_team_id: 'pro-team-1',
            owner_source_user_id: 'u1',
            owner_name: 'Alex One',
            team_name: 'Pros One',
            player_ids: ['p-pro-1'],
            reserve_ids: [],
            taxi_ids: [],
            wins: 0,
            losses: 0,
            ties: 0,
            points_for: 0,
            points_against: 0,
          },
        ],
        player_map: {
          'p-pro-1': { name: 'Pro Player 1', position: 'RB', team: 'BUF' },
        },
      },
      proSource: {
        provider: 'sleeper',
        sourceId: 'pro-l',
        side: 'pro',
        rosterDepth: 'all',
      },
      college: {
        league: {
          source: 'fantrax',
          source_league_id: 'college-l',
          name: 'College League',
          season: '2026',
          sport: 'NCAAF',
          scoring_type: 'PPR',
          roster_positions: ['QB', 'RB'],
          settings: {},
        },
        rosters: [
          {
            source_team_id: 'college-team-9',
            owner_source_user_id: 'u9',
            owner_name: 'Different Name',
            team_name: 'Campus One',
            player_ids: ['p-col-1'],
            reserve_ids: [],
            taxi_ids: [],
            wins: 0,
            losses: 0,
            ties: 0,
            points_for: 0,
            points_against: 0,
          },
        ],
        player_map: {
          'p-col-1': { name: 'College Player 1', position: 'WR', team: 'BAMA' },
        },
      },
      collegeSource: {
        provider: 'fantrax',
        sourceId: 'college-l',
        side: 'college',
        rosterDepth: 'all',
      },
      manualManagerMap: {
        'pro-team-1': 'college-team-9',
      },
    })

    expect(result.merged).toHaveLength(1)
    expect(result.unmatched.pro).toHaveLength(0)
    expect(result.unmatched.college).toHaveLength(0)
    expect(result.merged[0]?.proPlayers[0]?.name).toBe('Pro Player 1')
    expect(result.merged[0]?.collegePlayers[0]?.name).toBe('College Player 1')
  })

  it('commits merged C2C import to league/rosters/player states and stamps import settings', async () => {
    const { persistC2CMultiSource } = await import('@/lib/league-import/c2cMultiSourceCommit')

    const committed = await persistC2CMultiSource({
      appUserId: 'app-user-1',
      leagueName: 'C2C Import League',
      sport: 'NFL',
      draftType: 'c2c_snake',
      scoringPreset: 'ppr',
      merged: [
        {
          mergedKey: 'pro1::college1',
          displayName: 'Manager One',
          proTeamName: 'Pros One',
          collegeTeamName: 'Campus One',
          proPlayers: [{ playerId: 'p-pro-1', name: 'Pro 1', position: 'RB', team: 'BUF' }],
          collegePlayers: [{ playerId: 'p-col-1', name: 'College 1', position: 'WR', team: 'BAMA' }],
          proSource: { provider: 'sleeper', teamId: 'pro1' },
          collegeSource: { provider: 'fantrax', teamId: 'college1' },
        },
        {
          mergedKey: 'pro2::college2',
          displayName: 'Manager Two',
          proTeamName: 'Pros Two',
          collegeTeamName: 'Campus Two',
          proPlayers: [{ playerId: 'p-pro-2', name: 'Pro 2', position: 'WR', team: 'KC' }],
          collegePlayers: [{ playerId: 'p-col-2', name: 'College 2', position: 'RB', team: 'UGA' }],
          proSource: { provider: 'sleeper', teamId: 'pro2' },
          collegeSource: { provider: 'fantrax', teamId: 'college2' },
        },
      ],
      proSource: {
        provider: 'sleeper',
        sourceId: 'pro-league-1',
        side: 'pro',
        rosterDepth: 'all',
      },
      collegeSource: {
        provider: 'fantrax',
        sourceId: 'college-league-1',
        side: 'college',
        rosterDepth: 'all',
      },
    })

    expect(committed.leagueId).toBe('league-c2c-import-1')
    expect(committed.rostersCreated).toBe(2)
    expect(committed.playerStatesCreated).toBe(8)
    expect(committed.joinCode).toBe('JOIN1234')

    expect(executeCanonicalLeagueCreationMock).toHaveBeenCalledTimes(1)
    expect(rosterCreateMock).toHaveBeenCalledTimes(2)
    expect(c2CPlayerStateCreateManyMock).toHaveBeenCalledTimes(2)

    const settingsPayload = leagueUpdateMock.mock.calls[0]?.[0]?.data?.settings
    expect(settingsPayload.c2cImport.pro.provider).toBe('sleeper')
    expect(settingsPayload.c2cImport.college.provider).toBe('fantrax')
  })
})
