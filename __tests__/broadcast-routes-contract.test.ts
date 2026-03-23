import { beforeEach, describe, expect, it, vi } from 'vitest'

const getBroadcastPayloadMock = vi.fn()
const startBroadcastSessionMock = vi.fn()
const onMatchupCommentaryMock = vi.fn()
const getServerSessionMock = vi.fn()
const assertLeagueMemberMock = vi.fn()

vi.mock('@/lib/broadcast-engine', () => ({
  getBroadcastPayload: getBroadcastPayloadMock,
  startBroadcastSession: startBroadcastSessionMock,
}))

vi.mock('@/lib/commentary-engine', () => ({
  onMatchupCommentary: onMatchupCommentaryMock,
}))

vi.mock('next-auth', () => ({
  getServerSession: getServerSessionMock,
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/lib/league-access', () => ({
  assertLeagueMember: assertLeagueMemberMock,
}))

describe('Broadcast routes contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getServerSessionMock.mockResolvedValue({ user: { id: 'u-1' } })
    assertLeagueMemberMock.mockResolvedValue({
      leagueId: 'lg-1',
      leagueSport: 'NBA',
      isCommissioner: false,
      isMember: true,
    })
  })

  it('forwards payload filters with normalized sport/week', async () => {
    getBroadcastPayloadMock.mockResolvedValueOnce({
      leagueId: 'lg-1',
      leagueName: 'League',
      sport: 'NBA',
      standings: [],
      matchups: [],
      storylines: [],
      rivalries: [],
      currentWeek: 8,
      season: 2026,
      fetchedAt: new Date().toISOString(),
    })

    const { GET } = await import('@/app/api/leagues/[leagueId]/broadcast/payload/route')
    const req = new Request(
      'http://localhost/api/leagues/lg-1/broadcast/payload?sport=nba&week=8'
    )
    const res = await GET(req, { params: Promise.resolve({ leagueId: 'lg-1' }) })

    expect(res.status).toBe(200)
    expect(getBroadcastPayloadMock).toHaveBeenCalledWith({
      leagueId: 'lg-1',
      sport: 'NBA',
      week: 8,
    })
  })

  it('rejects invalid payload filters', async () => {
    const { GET } = await import('@/app/api/leagues/[leagueId]/broadcast/payload/route')

    const badSportReq = new Request(
      'http://localhost/api/leagues/lg-1/broadcast/payload?sport=bad'
    )
    const badSportRes = await GET(badSportReq, { params: Promise.resolve({ leagueId: 'lg-1' }) })
    expect(badSportRes.status).toBe(400)
    await expect(badSportRes.json()).resolves.toEqual({ error: 'Invalid sport' })

    const badWeekReq = new Request(
      'http://localhost/api/leagues/lg-1/broadcast/payload?week=abc'
    )
    const badWeekRes = await GET(badWeekReq, { params: Promise.resolve({ leagueId: 'lg-1' }) })
    expect(badWeekRes.status).toBe(400)
    await expect(badWeekRes.json()).resolves.toEqual({ error: 'Invalid week' })
  })

  it('requires commissioner and starts session with normalized sport and trimmed createdBy', async () => {
    startBroadcastSessionMock.mockResolvedValueOnce({
      sessionId: 's-1',
      leagueId: 'lg-1',
      sport: 'SOCCER',
      startedAt: new Date(),
    })
    getBroadcastPayloadMock.mockResolvedValueOnce({
      leagueId: 'lg-1',
      leagueName: 'League',
      sport: 'SOCCER',
      standings: [],
      matchups: [
        {
          matchupId: 'm-1',
          teamAId: 'a',
          teamAName: 'Alpha',
          teamBId: 'b',
          teamBName: 'Beta',
          scoreA: 101,
          scoreB: 99,
          winnerTeamId: null,
          weekOrPeriod: 8,
          season: 2026,
        },
      ],
      storylines: [],
      rivalries: [],
      currentWeek: 8,
      season: 2026,
      fetchedAt: new Date().toISOString(),
    })

    const { POST } = await import('@/app/api/leagues/[leagueId]/broadcast/session/route')
    const memberReq = new Request('http://localhost/api/leagues/lg-1/broadcast/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sport: 'soccer' }),
    })
    const memberRes = await POST(memberReq, { params: Promise.resolve({ leagueId: 'lg-1' }) })
    expect(memberRes.status).toBe(403)
    await expect(memberRes.json()).resolves.toEqual({ error: 'Forbidden: commissioner only' })

    assertLeagueMemberMock.mockResolvedValueOnce({
      leagueId: 'lg-1',
      leagueSport: 'SOCCER',
      isCommissioner: true,
      isMember: true,
    })
    const req = new Request('http://localhost/api/leagues/lg-1/broadcast/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sport: 'soccer', createdBy: '  watch-party-host  ' }),
    })
    const res = await POST(req, { params: Promise.resolve({ leagueId: 'lg-1' }) })

    expect(res.status).toBe(200)
    expect(startBroadcastSessionMock).toHaveBeenCalledWith('lg-1', {
      sport: 'SOCCER',
      createdBy: 'u-1',
    })
    expect(onMatchupCommentaryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'matchup_commentary',
        leagueId: 'lg-1',
        sport: 'SOCCER',
        teamAName: 'Alpha',
        teamBName: 'Beta',
      }),
      { skipStats: true, persist: true }
    )
  })

  it('rejects invalid sport for session start', async () => {
    const { POST } = await import('@/app/api/leagues/[leagueId]/broadcast/session/route')
    assertLeagueMemberMock.mockResolvedValueOnce({
      leagueId: 'lg-1',
      leagueSport: 'NBA',
      isCommissioner: true,
      isMember: true,
    })
    const req = new Request('http://localhost/api/leagues/lg-1/broadcast/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sport: 'invalid' }),
    })
    const res = await POST(req, { params: Promise.resolve({ leagueId: 'lg-1' }) })

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({ error: 'Invalid sport' })
  })
})
