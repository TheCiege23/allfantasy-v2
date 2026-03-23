import { beforeEach, describe, expect, it, vi } from 'vitest'

const listFranchiseProfilesMock = vi.fn()
const listProgressionEventsMock = vi.fn()
const getFranchiseProfileByManagerMock = vi.fn()
const getServerSessionMock = vi.fn()
const runGMEconomyForManagerMock = vi.fn()

vi.mock('@/lib/gm-economy/GMProfileQueryService', () => ({
  listFranchiseProfiles: listFranchiseProfilesMock,
  listProgressionEvents: listProgressionEventsMock,
  getFranchiseProfileByManager: getFranchiseProfileByManagerMock,
}))

vi.mock('next-auth', () => ({
  getServerSession: getServerSessionMock,
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/lib/gm-economy/GMEconomyEngine', () => ({
  runGMEconomyForManager: runGMEconomyForManagerMock,
}))

describe('GM economy route contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getServerSessionMock.mockResolvedValue({ user: { id: 'u1' } })
  })

  it('forwards leaderboard sport filters to query service', async () => {
    listFranchiseProfilesMock.mockResolvedValue({ profiles: [], total: 0 })
    const { GET } = await import('@/app/api/gm-economy/leaderboard/route')
    const req = new Request(
      'http://localhost/api/gm-economy/leaderboard?orderBy=gmPrestigeScore&sport=NBA&limit=25&offset=5'
    )

    const res = await GET(req)
    expect(res.status).toBe(200)
    expect(listFranchiseProfilesMock).toHaveBeenCalledWith({
      orderBy: 'gmPrestigeScore',
      limit: 25,
      offset: 5,
      sport: 'NBA',
    })
  })

  it('normalizes progression filters and rejects unsupported event types', async () => {
    listProgressionEventsMock.mockResolvedValue({ events: [], total: 0 })
    const { GET } = await import('@/app/api/gm-economy/progression/route')
    const req = new Request(
      'http://localhost/api/gm-economy/progression?managerId=u1&sport=nba&eventType=unknown'
    )

    const res = await GET(req)
    expect(res.status).toBe(200)
    expect(listProgressionEventsMock).toHaveBeenCalledWith({
      managerId: 'u1',
      sport: 'NBA',
      eventType: undefined,
      limit: 50,
      offset: 0,
    })
  })

  it('forbids reading another manager profile and explain', async () => {
    const profileRoute = await import('@/app/api/gm-economy/profile/route')
    const explainRoute = await import('@/app/api/gm-economy/explain/route')

    const profileReq = new Request('http://localhost/api/gm-economy/profile?managerId=u2')
    const profileRes = await profileRoute.GET(profileReq)
    expect(profileRes.status).toBe(403)
    await expect(profileRes.json()).resolves.toEqual({ error: 'Forbidden' })

    const explainReq = new Request('http://localhost/api/gm-economy/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ managerId: 'u2' }),
    })
    const explainRes = await explainRoute.POST(explainReq)
    expect(explainRes.status).toBe(403)
    await expect(explainRes.json()).resolves.toEqual({ error: 'Forbidden' })
  })

  it('returns unauthorized for gm run route without session', async () => {
    getServerSessionMock.mockResolvedValue(null)
    const { POST } = await import('@/app/api/gm-economy/run/route')
    const req = new Request('http://localhost/api/gm-economy/run', { method: 'POST' })

    const res = await POST(req)
    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toEqual({ error: 'Unauthorized' })
  })

  it('runs only current manager when run body is empty', async () => {
    runGMEconomyForManagerMock.mockResolvedValue({
      managerId: 'u1',
      profileId: 'p1',
      gmPrestigeScore: 77,
      franchiseValue: 2500,
      created: true,
      progressionEventsCreated: 5,
    })
    const { POST } = await import('@/app/api/gm-economy/run/route')
    const req = new Request('http://localhost/api/gm-economy/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(runGMEconomyForManagerMock).toHaveBeenCalledWith('u1')
    await expect(res.json()).resolves.toMatchObject({
      processed: 1,
      progressionEventsCreated: 5,
    })
  })
})
