import { beforeEach, describe, expect, it, vi } from 'vitest'

const getServerSessionMock = vi.fn()
const getGlobalIntelligenceMock = vi.fn()

vi.mock('next-auth', () => ({
  getServerSession: getServerSessionMock,
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/lib/global-intelligence', () => ({
  getGlobalIntelligence: getGlobalIntelligenceMock,
}))

describe('Global intelligence route contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getServerSessionMock.mockResolvedValue({ user: { id: 'u-1' } })
    getGlobalIntelligenceMock.mockResolvedValue({
      leagueId: 'lg-1',
      sport: 'NBA',
      meta: null,
      simulation: null,
      advisor: null,
      media: null,
      draft: null,
      generatedAt: '2026-03-22T00:00:00.000Z',
    })
  })

  it('validates required leagueId', async () => {
    const { POST } = await import('@/app/api/intelligence/global/route')
    const res = await POST(
      new Request('http://localhost/api/intelligence/global', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }) as any
    )

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({
      error: 'leagueId (string) required',
    })
  })

  it('forwards normalized include, season, and week to engine', async () => {
    const { POST } = await import('@/app/api/intelligence/global/route')
    const res = await POST(
      new Request('http://localhost/api/intelligence/global', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leagueId: 'lg-1',
          sport: 'nba',
          season: '2029',
          week: '5',
          include: ['meta', 'bad-module', 'draft'],
        }),
      }) as any
    )

    expect(res.status).toBe(200)
    expect(getGlobalIntelligenceMock).toHaveBeenCalledWith({
      leagueId: 'lg-1',
      userId: 'u-1',
      sport: 'nba',
      season: 2029,
      week: 5,
      include: ['meta', 'draft'],
    })
  })

  it('passes null userId when session is absent', async () => {
    const { POST } = await import('@/app/api/intelligence/global/route')
    getServerSessionMock.mockResolvedValueOnce(null)

    const res = await POST(
      new Request('http://localhost/api/intelligence/global', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leagueId: 'lg-2', include: ['media'] }),
      }) as any
    )

    expect(res.status).toBe(200)
    expect(getGlobalIntelligenceMock).toHaveBeenCalledWith({
      leagueId: 'lg-2',
      userId: null,
      sport: null,
      season: undefined,
      week: undefined,
      include: ['media'],
    })
  })
})
