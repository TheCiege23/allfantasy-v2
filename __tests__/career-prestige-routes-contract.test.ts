import { beforeEach, describe, expect, it, vi } from 'vitest'

const getUnifiedCareerProfileMock = vi.fn()
const getLeaguePrestigeSummaryMock = vi.fn()
const getCareerLeaderboardMock = vi.fn()
const buildCareerContextForManagerMock = vi.fn()
const buildCareerContextForLeagueMock = vi.fn()
const runAllForLeagueMock = vi.fn()
const runAllForManagerMock = vi.fn()
const getServerSessionMock = vi.fn()
const assertLeagueMemberMock = vi.fn()

vi.mock('@/lib/career-prestige/UnifiedCareerQueryService', () => ({
  getUnifiedCareerProfile: getUnifiedCareerProfileMock,
  getLeaguePrestigeSummary: getLeaguePrestigeSummaryMock,
  getCareerLeaderboard: getCareerLeaderboardMock,
}))

vi.mock('@/lib/career-prestige/AICareerContextService', () => ({
  buildCareerContextForManager: buildCareerContextForManagerMock,
  buildCareerContextForLeague: buildCareerContextForLeagueMock,
}))

vi.mock('@/lib/career-prestige/CareerPrestigeOrchestrator', () => ({
  runAllForLeague: runAllForLeagueMock,
  runAllForManager: runAllForManagerMock,
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

describe('Career prestige route contracts', () => {
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

  it('forwards profile params with normalized sport', async () => {
    getUnifiedCareerProfileMock.mockResolvedValue({ managerId: 'u-1' })
    const { GET } = await import('@/app/api/career-prestige/profile/route')
    const req = new Request(
      'http://localhost/api/career-prestige/profile?managerId=u-1&leagueId=lg-1&sport=nba'
    )

    const res = await GET(req)
    expect(res.status).toBe(200)
    expect(getUnifiedCareerProfileMock).toHaveBeenCalledWith('u-1', {
      leagueId: 'lg-1',
      sport: 'NBA',
    })
  })

  it('forwards league and leaderboard filters and rejects invalid sport', async () => {
    getLeaguePrestigeSummaryMock.mockResolvedValue({ leagueId: 'lg-1' })
    getCareerLeaderboardMock.mockResolvedValue([])

    const leagueRoute = await import('@/app/api/career-prestige/league/route')
    const leagueReq = new Request(
      'http://localhost/api/career-prestige/league?leagueId=lg-1&sport=nfl'
    )
    const leagueRes = await leagueRoute.GET(leagueReq)
    expect(leagueRes.status).toBe(200)
    expect(getLeaguePrestigeSummaryMock).toHaveBeenCalledWith('lg-1', 'NFL')

    const leaderboardRoute = await import('@/app/api/career-prestige/leaderboard/route')
    const leaderboardReq = new Request(
      'http://localhost/api/career-prestige/leaderboard?leagueId=lg-1&sport=nhl&limit=20'
    )
    const leaderboardRes = await leaderboardRoute.GET(leaderboardReq)
    expect(leaderboardRes.status).toBe(200)
    expect(getCareerLeaderboardMock).toHaveBeenCalledWith({
      leagueId: 'lg-1',
      sport: 'NHL',
      limit: 20,
    })

    const invalidReq = new Request(
      'http://localhost/api/career-prestige/leaderboard?leagueId=lg-1&sport=bad'
    )
    const invalidRes = await leaderboardRoute.GET(invalidReq)
    expect(invalidRes.status).toBe(400)
    await expect(invalidRes.json()).resolves.toEqual({ error: 'Invalid sport' })
  })

  it('dispatches explain route to manager or league builders', async () => {
    buildCareerContextForManagerMock.mockResolvedValue({
      narrativeHint: 'manager narrative',
    })
    buildCareerContextForLeagueMock.mockResolvedValue({
      narrativeHint: 'league narrative',
      summary: { leagueId: 'lg-1' },
    })
    const { POST } = await import('@/app/api/career-prestige/explain/route')

    const managerReq = new Request('http://localhost/api/career-prestige/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ managerId: 'u-1', leagueId: 'lg-1', sport: 'nba' }),
    })
    const managerRes = await POST(managerReq)
    expect(managerRes.status).toBe(200)
    expect(buildCareerContextForManagerMock).toHaveBeenCalledWith('u-1', {
      leagueId: 'lg-1',
      sport: 'NBA',
    })

    const leagueReq = new Request('http://localhost/api/career-prestige/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leagueId: 'lg-1', sport: 'nba' }),
    })
    const leagueRes = await POST(leagueReq)
    expect(leagueRes.status).toBe(200)
    expect(buildCareerContextForLeagueMock).toHaveBeenCalledWith('lg-1', 'NBA')

    const mismatchReq = new Request('http://localhost/api/career-prestige/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leagueId: 'lg-1', sport: 'nfl' }),
    })
    const mismatchRes = await POST(mismatchReq)
    expect(mismatchRes.status).toBe(400)
    await expect(mismatchRes.json()).resolves.toEqual({ error: 'Sport must match league sport' })
  })

  it('enforces run auth, commissioner league runs, and manager ownership', async () => {
    const { POST } = await import('@/app/api/career-prestige/run/route')

    getServerSessionMock.mockResolvedValueOnce(null)
    const unauthReq = new Request('http://localhost/api/career-prestige/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leagueId: 'lg-1' }),
    })
    const unauthRes = await POST(unauthReq)
    expect(unauthRes.status).toBe(401)

    getServerSessionMock.mockResolvedValueOnce({ user: { id: 'u-1' } })
    const forbiddenReq = new Request('http://localhost/api/career-prestige/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ managerId: 'u-2' }),
    })
    const forbiddenRes = await POST(forbiddenReq)
    expect(forbiddenRes.status).toBe(403)
    await expect(forbiddenRes.json()).resolves.toEqual({
      error: 'Forbidden: can only run own managerId',
    })

    getServerSessionMock.mockResolvedValueOnce({ user: { id: 'u-1' } })
    const memberLeagueReq = new Request('http://localhost/api/career-prestige/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leagueId: 'lg-1', sport: 'nba' }),
    })
    const memberLeagueRes = await POST(memberLeagueReq)
    expect(memberLeagueRes.status).toBe(403)
    await expect(memberLeagueRes.json()).resolves.toEqual({
      error: 'Forbidden: commissioner only',
    })

    getServerSessionMock.mockResolvedValueOnce({ user: { id: 'u-1' } })
    assertLeagueMemberMock.mockResolvedValueOnce({
      leagueId: 'lg-1',
      leagueSport: 'NBA',
      isCommissioner: true,
      isMember: true,
    })
    runAllForLeagueMock.mockResolvedValueOnce({ leagueId: 'lg-1' })
    const leagueReq = new Request('http://localhost/api/career-prestige/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leagueId: 'lg-1', sport: 'nba', seasons: ['2025', ' 2024 '] }),
    })
    const leagueRes = await POST(leagueReq)
    expect(leagueRes.status).toBe(200)
    expect(runAllForLeagueMock).toHaveBeenCalledWith('lg-1', {
      sport: 'NBA',
      seasons: ['2025', '2024'],
    })
  })
})
