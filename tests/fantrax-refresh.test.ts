import { beforeEach, describe, expect, it, vi } from 'vitest'
import { syncLeague } from '@/lib/league-sync-core'

const mocks = vi.hoisted(() => ({
  fetchFantrax: vi.fn(),
  findLeague: vi.fn(),
  findTeams: vi.fn(),
  findRosters: vi.fn(),
  updateTeam: vi.fn(),
  updateRoster: vi.fn(),
  updateLeague: vi.fn(),
  transaction: vi.fn(),
}))

vi.mock('@/lib/league-import/fantrax/FantraxApiFetchService', () => ({
  parseFantraxApiSource: (input: string) =>
    /^[a-z0-9]{16}$/i.test(input) ? { leagueId: input, sport: null } : null,
  fetchFantraxApiLeagueForImport: mocks.fetchFantrax,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    league: { findFirst: mocks.findLeague, update: mocks.updateLeague },
    leagueTeam: { findMany: mocks.findTeams, update: mocks.updateTeam },
    roster: { findMany: mocks.findRosters, update: mocks.updateRoster },
    $transaction: mocks.transaction,
  },
}))

const leagueId = '51isdapqmt6atvdz'
const payload = {
  league: { leagueId, name: 'Late Start League 10', sport: 'NBA', season: 2026, size: 1 },
  settings: { raw: { standingsAvailable: true } },
  teams: [{
    teamId: 't1',
    managerId: 'fantrax-manager:t1',
    managerName: 'Original Manager',
    teamName: 'External Team',
    logoUrl: null,
    wins: 2,
    losses: 1,
    ties: 0,
    rank: 1,
    pointsFor: 120,
    pointsAgainst: null,
    rosterPlayerIds: ['p1', 'p2'],
    starterPlayerIds: ['p1'],
    reservePlayerIds: ['p2'],
  }],
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.findLeague.mockResolvedValue({
    id: 'local-league',
    name: 'My NBA League',
    sport: 'NBA',
    season: 2026,
    scoring: 'custom',
    isDynasty: true,
  })
  mocks.findTeams.mockResolvedValue([{ id: 'local-team', externalId: 't1' }])
  mocks.findRosters.mockResolvedValue([{
    id: 'local-roster',
    platformUserId: 'claimed-app-user',
    playerData: {
      source_team_id: 't1',
      import: { sourceTeamId: 't1', displayName: 'Original Manager' },
      players: ['old-player'],
    },
  }])
  mocks.fetchFantrax.mockResolvedValue(payload)
  mocks.updateTeam.mockImplementation(async (args) => args)
  mocks.updateRoster.mockImplementation(async (args) => args)
  mocks.updateLeague.mockImplementation(async (args) => args)
  mocks.transaction.mockImplementation(async (operations) => Promise.all(operations))
})

describe('Fantrax refresh', () => {
  it('updates roster data and standings while preserving claimed ownership and league rules', async () => {
    const result = await syncLeague('owner', 'fantrax', leagueId)

    expect(result.leagueId).toBe('local-league')
    expect(result.rostersSync).toBe(1)
    expect(result.isDynasty).toBe(true)
    expect(mocks.fetchFantrax).toHaveBeenCalledWith(
      `NBA:${leagueId}`,
      { leagueId, sport: 'NBA' }
    )
    expect(mocks.updateRoster).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'local-roster' },
      data: {
        playerData: expect.objectContaining({
          players: ['p1', 'p2'],
          starters: ['p1'],
          reserve: ['p2'],
          import: { sourceTeamId: 't1', displayName: 'Original Manager' },
        }),
      },
    }))
    expect(mocks.updateTeam.mock.calls[0][0].data).toMatchObject({
      teamName: 'External Team',
      wins: 2,
      losses: 1,
    })
    expect(mocks.updateTeam.mock.calls[0][0].data).not.toHaveProperty('role')
    expect(mocks.updateLeague.mock.calls[0][0].data).not.toHaveProperty('settings')
    expect(mocks.updateRoster.mock.calls[0][0].data).not.toHaveProperty('platformUserId')
    expect(mocks.transaction).toHaveBeenCalledTimes(1)
  })

  it('does not overwrite standings when Fantrax returned incomplete standings', async () => {
    mocks.fetchFantrax.mockResolvedValue({
      ...payload,
      settings: { raw: { standingsAvailable: false } },
    })
    await syncLeague('owner', 'fantrax', leagueId)
    expect(mocks.updateTeam.mock.calls[0][0].data).not.toHaveProperty('wins')
    expect(mocks.updateTeam.mock.calls[0][0].data).not.toHaveProperty('currentRank')
  })

  it('protects a claimed team when Fantrax unexpectedly returns an empty roster', async () => {
    mocks.fetchFantrax.mockResolvedValue({
      ...payload,
      teams: [{ ...payload.teams[0], rosterPlayerIds: [], starterPlayerIds: [], reservePlayerIds: [] }],
    })
    await expect(syncLeague('owner', 'fantrax', leagueId)).rejects.toThrow(
      'Refresh stopped to protect existing players'
    )
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it('stops without writing when an imported roster is missing', async () => {
    mocks.findRosters.mockResolvedValue([])
    await expect(syncLeague('owner', 'fantrax', leagueId)).rejects.toThrow(
      'An imported Fantrax team or roster is missing'
    )
    expect(mocks.updateTeam).not.toHaveBeenCalled()
    expect(mocks.transaction).not.toHaveBeenCalled()
  })
})
