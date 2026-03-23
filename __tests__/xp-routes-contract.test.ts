import { beforeEach, describe, expect, it, vi } from 'vitest'

const getLeaderboardMock = vi.fn()
const getEventsByManagerIdMock = vi.fn()
const getOrCreateProfileViewMock = vi.fn()
const explainXPForManagerMock = vi.fn()
const getServerSessionMock = vi.fn()
const runForManagerMock = vi.fn()

vi.mock('@/lib/xp-progression/ManagerXPQueryService', () => ({
  getLeaderboard: getLeaderboardMock,
  getEventsByManagerId: getEventsByManagerIdMock,
  getOrCreateProfileView: getOrCreateProfileViewMock,
}))

vi.mock('@/lib/xp-progression/XPExplainService', () => ({
  explainXPForManager: explainXPForManagerMock,
}))

vi.mock('next-auth', () => ({
  getServerSession: getServerSessionMock,
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/lib/xp-progression/XPProgressionEngine', () => ({
  runForManager: runForManagerMock,
}))

describe('XP route contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getServerSessionMock.mockResolvedValue({ user: { id: 'u1' } })
  })

  it('forwards leaderboard tier and sport filters', async () => {
    getLeaderboardMock.mockResolvedValue([])
    const { GET } = await import('@/app/api/xp/leaderboard/route')
    const req = new Request(
      'http://localhost/api/xp/leaderboard?tier=Gold%20GM&sport=nba&limit=15'
    )

    const res = await GET(req)
    expect(res.status).toBe(200)
    expect(getLeaderboardMock).toHaveBeenCalledWith({
      tier: 'Gold GM',
      sport: 'NBA',
      limit: 15,
    })
  })

  it('normalizes events filters and ignores unknown event type', async () => {
    getEventsByManagerIdMock.mockResolvedValue([])
    const { GET } = await import('@/app/api/xp/events/route')
    const req = new Request(
      'http://localhost/api/xp/events?managerId=u1&sport=mlb&eventType=unknown&limit=20'
    )

    const res = await GET(req)
    expect(res.status).toBe(200)
    expect(getEventsByManagerIdMock).toHaveBeenCalledWith('u1', {
      sport: 'MLB',
      eventType: undefined,
      limit: 20,
    })
  })

  it('forbids reading or explaining another manager profile', async () => {
    const profileRoute = await import('@/app/api/xp/profile/route')
    const explainRoute = await import('@/app/api/xp/explain/route')

    const profileReq = new Request('http://localhost/api/xp/profile?managerId=u2')
    const profileRes = await profileRoute.GET(profileReq)
    expect(profileRes.status).toBe(403)
    await expect(profileRes.json()).resolves.toEqual({ error: 'Forbidden' })

    const explainReq = new Request('http://localhost/api/xp/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ managerId: 'u2' }),
    })
    const explainRes = await explainRoute.POST(explainReq)
    expect(explainRes.status).toBe(403)
    await expect(explainRes.json()).resolves.toEqual({ error: 'Forbidden' })
  })

  it('returns unauthorized for xp run without session', async () => {
    getServerSessionMock.mockResolvedValue(null)
    const { POST } = await import('@/app/api/xp/run/route')
    const req = new Request('http://localhost/api/xp/run', { method: 'POST' })

    const res = await POST(req)
    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toEqual({ error: 'Unauthorized' })
  })

  it('forbids running another manager profile', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 'u1' } })
    const { POST } = await import('@/app/api/xp/run/route')
    const req = new Request('http://localhost/api/xp/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ managerId: 'u2', sport: 'nfl' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(403)
    await expect(res.json()).resolves.toMatchObject({
      error: 'Forbidden: can only run XP for your own managerId',
    })
  })

  it('runs manager XP with normalized sport', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 'u1' } })
    runForManagerMock.mockResolvedValue({
      managerId: 'u1',
      totalXP: 100,
      currentTier: 'Silver GM',
      eventsCreated: 5,
      profileUpserted: true,
    })
    const { POST } = await import('@/app/api/xp/run/route')
    const req = new Request('http://localhost/api/xp/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ managerId: 'u1', sport: 'soccer' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(runForManagerMock).toHaveBeenCalledWith('u1', { sport: 'SOCCER' })
  })
})
