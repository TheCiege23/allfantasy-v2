import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createMockNextRequest } from "@/__tests__/helpers/createMockNextRequest"
const getServerSessionMock = vi.fn()
const suggestLeaguesMock = vi.fn()
const bracketLeagueFindManyMock = vi.fn()

vi.mock('next-auth', () => ({
  getServerSession: getServerSessionMock,
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/lib/league-discovery', () => ({
  suggestLeagues: suggestLeaguesMock,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    bracketLeague: {
      findMany: bracketLeagueFindManyMock,
    },
  },
}))

describe('League discovery suggest route contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getServerSessionMock.mockResolvedValue({ user: { id: 'u-1' } })
  })

  it('requires auth and candidate source', async () => {
    const { POST } = await import('@/app/api/league/discovery/suggest/route')

    getServerSessionMock.mockResolvedValueOnce(null)
    const unauthRes = await POST(
      createMockNextRequest('http://localhost/api/league/discovery/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }) as any
    )
    expect(unauthRes.status).toBe(401)

    const noSourceRes = await POST(
      createMockNextRequest('http://localhost/api/league/discovery/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: { skillLevel: 'intermediate' } }),
      }) as any
    )
    expect(noSourceRes.status).toBe(400)
    await expect(noSourceRes.json()).resolves.toEqual({
      error: 'Provide either candidates or tournamentId to get suggestions.',
    })
  })

  it('forwards normalized candidates to suggestion engine', async () => {
    const { POST } = await import('@/app/api/league/discovery/suggest/route')
    suggestLeaguesMock.mockResolvedValueOnce({
      suggestions: [{ id: 'lg-1', name: 'League 1', matchScore: 88, summary: 'Fit', reasons: [] }],
      generatedAt: '2026-03-22T00:00:00.000Z',
    })

    const res = await POST(
      createMockNextRequest('http://localhost/api/league/discovery/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferences: {
            skillLevel: 'advanced',
            sportsPreferences: ['nfl', 'nba'],
            preferredActivity: 'active',
            competitionBalance: 'competitive',
          },
          candidates: [
            {
              id: 'lg-1',
              name: 'League 1',
              sport: 'nfl',
              maxManagers: 14,
              scoringMode: 'fancred_edge',
            },
          ],
        }),
      }) as any
    )

    expect(res.status).toBe(200)
    expect(suggestLeaguesMock).toHaveBeenCalledWith({
      preferences: {
        skillLevel: 'advanced',
        sportsPreferences: ['nfl', 'nba'],
        preferredActivity: 'active',
        competitionBalance: 'competitive',
      },
      candidates: [
        expect.objectContaining({
          id: 'lg-1',
          sport: 'NFL',
        }),
      ],
    })
  })

  it('builds candidates from tournament pools when tournamentId is provided', async () => {
    const { POST } = await import('@/app/api/league/discovery/suggest/route')
    bracketLeagueFindManyMock.mockResolvedValueOnce([
      {
        id: 'pool-1',
        name: 'Pool One',
        joinCode: 'ABC123',
        maxManagers: 12,
        scoringRules: { mode: 'fancred_edge', isPaidLeague: true },
        _count: { members: 10, entries: 14 },
        tournament: { name: 'Tourney', season: 2026, sport: 'NBA' },
      },
    ])
    suggestLeaguesMock.mockResolvedValueOnce({
      suggestions: [],
      generatedAt: '2026-03-22T00:00:00.000Z',
    })

    const res = await POST(
      createMockNextRequest('http://localhost/api/league/discovery/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tournamentId: 't-1',
          preferences: { skillLevel: 'intermediate' },
        }),
      }) as any
    )

    expect(res.status).toBe(200)
    expect(bracketLeagueFindManyMock).toHaveBeenCalled()
    expect(suggestLeaguesMock).toHaveBeenCalledWith({
      preferences: { skillLevel: 'intermediate' },
      candidates: [
        expect.objectContaining({
          id: 'pool-1',
          sport: 'NBA',
          activityLevel: 'moderate',
          competitionSpread: 'competitive',
        }),
      ],
    })
  })
})
