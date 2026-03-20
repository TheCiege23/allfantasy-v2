import { beforeEach, describe, expect, it, vi } from 'vitest'

const sportsTeamFindManyMock = vi.fn()
const sportsTeamFindFirstMock = vi.fn()
const sportsPlayerFindManyMock = vi.fn()
const sportsPlayerFindFirstMock = vi.fn()
const playerIdentityFindManyMock = vi.fn()
const playerIdentityFindFirstMock = vi.fn()

vi.mock('@/lib/prisma', () => ({
  prisma: {
    sportsTeam: {
      findMany: sportsTeamFindManyMock,
      findFirst: sportsTeamFindFirstMock,
    },
    sportsPlayer: {
      findMany: sportsPlayerFindManyMock,
      findFirst: sportsPlayerFindFirstMock,
    },
    playerIdentityMap: {
      findMany: playerIdentityFindManyMock,
      findFirst: playerIdentityFindFirstMock,
    },
  },
}))

describe('Sport teams, logos, and player pool mapping', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sportsTeamFindManyMock.mockResolvedValue([])
    sportsTeamFindFirstMock.mockResolvedValue(null)
    sportsPlayerFindManyMock.mockResolvedValue([])
    sportsPlayerFindFirstMock.mockResolvedValue(null)
    playerIdentityFindManyMock.mockResolvedValue([])
    playerIdentityFindFirstMock.mockResolvedValue(null)
  })

  it('prefers DB-enriched team metadata with logos and sport scoping', async () => {
    const { getTeamMetadataForSportDbAware } = await import('@/lib/sport-teams/SportTeamMetadataRegistry')

    sportsTeamFindManyMock.mockResolvedValue([
      {
        sport: 'NBA',
        externalId: 'LAL',
        name: 'Los Angeles Lakers',
        shortName: 'LAL',
        city: 'Los Angeles',
        conference: 'West',
        division: 'Pacific',
        logo: 'https://cdn.example/lal.png',
        primaryColor: '#552583',
        fetchedAt: new Date('2026-01-01T00:00:00Z'),
      },
    ])

    const teams = await getTeamMetadataForSportDbAware('NBA')
    expect(teams.length).toBe(1)
    expect(teams[0]).toEqual(
      expect.objectContaining({
        team_id: 'LAL',
        sport_type: 'NBA',
        team_name: 'Los Angeles Lakers',
        city: 'Los Angeles',
        abbreviation: 'LAL',
        conference: 'West',
        division: 'Pacific',
        primary_logo_url: 'https://cdn.example/lal.png',
        primary_color: '#552583',
      })
    )
  })

  it('maps player pool by sport and backfills team_id from abbreviation when missing', async () => {
    const { getPlayerPoolForSport } = await import('@/lib/sport-teams/SportPlayerPoolResolver')

    sportsPlayerFindManyMock.mockResolvedValue([
      {
        id: 'p1',
        sport: 'NBA',
        teamId: null,
        team: 'LAL',
        name: 'LeBron James',
        position: 'SF',
        status: 'ACTIVE',
        sleeperId: 's1',
        externalId: 'ext1',
        age: 40,
      },
    ])

    const players = await getPlayerPoolForSport('NBA', { limit: 10 })
    expect(players.length).toBe(1)
    expect(players[0]).toEqual(
      expect.objectContaining({
        sport_type: 'NBA',
        team_abbreviation: 'LAL',
        team_id: 'LAL',
        full_name: 'LeBron James',
        position: 'SF',
      })
    )
  })

  it('supports soccer GK alias and NFL IDP grouped position filters in player pool queries', async () => {
    const { getPlayerPoolForSport } = await import('@/lib/sport-teams/SportPlayerPoolResolver')

    sportsPlayerFindManyMock.mockResolvedValueOnce([
      {
        id: 's-gk-1',
        sport: 'SOCCER',
        teamId: 'MIA',
        team: 'MIA',
        name: 'Soccer Keeper',
        position: 'GKP',
        status: 'ACTIVE',
        sleeperId: null,
        externalId: 'soc-gk-1',
        age: 27,
      },
    ])

    const soccerGk = await getPlayerPoolForSport('SOCCER', { position: 'GK', limit: 10 })
    expect(soccerGk.length).toBe(1)
    expect(soccerGk[0]?.position).toBe('GKP')

    sportsPlayerFindManyMock.mockResolvedValueOnce([
      {
        id: 'nfl-de-1',
        sport: 'NFL',
        teamId: 'KC',
        team: 'KC',
        name: 'Edge Rusher',
        position: 'DE',
        status: 'ACTIVE',
        sleeperId: null,
        externalId: 'nfl-de-1',
        age: 25,
      },
      {
        id: 'nfl-dt-1',
        sport: 'NFL',
        teamId: 'KC',
        team: 'KC',
        name: 'Interior Lineman',
        position: 'DT',
        status: 'ACTIVE',
        sleeperId: null,
        externalId: 'nfl-dt-1',
        age: 28,
      },
    ])

    const nflDl = await getPlayerPoolForSport('NFL', { position: 'DL', limit: 10 })
    expect(nflDl.map((p) => p.position)).toEqual(expect.arrayContaining(['DE', 'DT']))
  })

  it('falls back to identity defensive players for NFL IDP when sportsPlayer rows are sparse', async () => {
    const { getPlayerPoolForSport } = await import('@/lib/sport-teams/SportPlayerPoolResolver')

    sportsPlayerFindManyMock.mockResolvedValueOnce([])
    playerIdentityFindManyMock.mockResolvedValueOnce([
      {
        id: 'idp-ident-1',
        canonicalName: 'Fallback Linebacker',
        position: 'LB',
        currentTeam: 'DAL',
        sleeperId: 'idp-slp-1',
        apiSportsId: null,
        fantasyCalcId: null,
        sport: 'NFL',
        status: 'ACTIVE',
      },
    ])

    const players = await getPlayerPoolForSport('NFL', { position: 'IDP_FLEX', limit: 10 })
    expect(players.length).toBe(1)
    expect(players[0]).toEqual(
      expect.objectContaining({
        full_name: 'Fallback Linebacker',
        position: 'LB',
        team_abbreviation: 'DAL',
        sport_type: 'NFL',
      })
    )
  })

  it('resolves logo from db first and static fallback otherwise', async () => {
    const { resolveTeamLogoUrl, resolveTeamLogoUrlSync } = await import('@/lib/sport-teams/TeamLogoResolver')

    sportsTeamFindFirstMock.mockResolvedValueOnce({ logo: 'https://cdn.example/bos.png' })
    const dbLogo = await resolveTeamLogoUrl('BOS', 'NBA')
    expect(dbLogo).toBe('https://cdn.example/bos.png')

    sportsTeamFindFirstMock.mockResolvedValueOnce(null)
    const fallbackLogo = await resolveTeamLogoUrl('LAL', 'NBA')
    expect(fallbackLogo).toContain('/nba/500/lal.png')

    const syncLogo = resolveTeamLogoUrlSync('LAL', 'NBA')
    expect(syncLogo).toContain('/nba/500/lal.png')
  })

  it('bootstraps league player pool context with sport-specific teams and players', async () => {
    const { bootstrapLeaguePlayerPool } = await import('@/lib/sport-teams/LeaguePlayerPoolBootstrapService')

    sportsPlayerFindManyMock.mockResolvedValue([
      { id: 'p1', sport: 'MLB', teamId: 'NYY', team: 'NYY', name: 'Aaron Judge', position: 'OF', status: 'ACTIVE', sleeperId: null, externalId: 'aj', age: 34 },
      { id: 'p2', sport: 'MLB', teamId: 'BOS', team: 'BOS', name: 'Rafael Devers', position: '3B', status: 'ACTIVE', sleeperId: null, externalId: 'rd', age: 29 },
    ])
    sportsTeamFindManyMock.mockResolvedValue([
      {
        sport: 'MLB',
        externalId: 'NYY',
        name: 'New York Yankees',
        shortName: 'NYY',
        city: 'New York',
        conference: null,
        division: 'AL East',
        logo: 'https://cdn.example/nyy.png',
        primaryColor: '#1c2841',
        fetchedAt: new Date('2026-01-01T00:00:00Z'),
      },
      {
        sport: 'MLB',
        externalId: 'BOS',
        name: 'Boston Red Sox',
        shortName: 'BOS',
        city: 'Boston',
        conference: null,
        division: 'AL East',
        logo: 'https://cdn.example/bos.png',
        primaryColor: '#bd3039',
        fetchedAt: new Date('2026-01-01T00:00:00Z'),
      },
    ])

    const result = await bootstrapLeaguePlayerPool('league-1', 'MLB')
    expect(result.leagueSport).toBe('MLB')
    expect(result.playerCount).toBe(2)
    expect(result.teamCount).toBe(2)
  })
})
