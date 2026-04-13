import { beforeEach, describe, expect, it, vi } from 'vitest'

const getServerSessionMock = vi.fn()
const compareLeagueRosterToTemplateMock = vi.fn()

vi.mock('next-auth', () => ({
  getServerSession: getServerSessionMock,
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/lib/roster-engine', () => ({
  compareLeagueRosterToTemplate: compareLeagueRosterToTemplateMock,
}))

describe('/api/commissioner/leagues/[leagueId]/roster-settings/compare-template route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getServerSessionMock.mockResolvedValue({ user: { id: 'u-1' } })
  })

  it('returns 401 when user is not authenticated', async () => {
    getServerSessionMock.mockResolvedValueOnce(null)
    const { GET } = await import('../app/api/commissioner/leagues/[leagueId]/roster-settings/compare-template/route')

    const res = await GET(new Request('http://localhost') as any, {
      params: Promise.resolve({ leagueId: 'l1' }),
    })

    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Unauthorized' })
  })

  it('returns compare payload for authenticated user', async () => {
    compareLeagueRosterToTemplateMock.mockResolvedValue({
      matchesTemplate: false,
      templateKey: 'redraft',
      diff: { changedKeys: ['QB'], changedCount: 1 },
    })

    const { GET } = await import('../app/api/commissioner/leagues/[leagueId]/roster-settings/compare-template/route')
    const res = await GET(new Request('http://localhost') as any, {
      params: Promise.resolve({ leagueId: 'l1' }),
    })

    expect(compareLeagueRosterToTemplateMock).toHaveBeenCalledWith('l1')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      matchesTemplate: false,
      templateKey: 'redraft',
      diff: { changedKeys: ['QB'], changedCount: 1 },
    })
  })

  it('returns 400 on service error', async () => {
    compareLeagueRosterToTemplateMock.mockRejectedValue(new Error('League not found'))

    const { GET } = await import('../app/api/commissioner/leagues/[leagueId]/roster-settings/compare-template/route')
    const res = await GET(new Request('http://localhost') as any, {
      params: Promise.resolve({ leagueId: 'missing' }),
    })

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'League not found' })
  })
})
