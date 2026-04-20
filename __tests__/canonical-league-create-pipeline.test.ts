import { beforeEach, describe, expect, it, vi } from 'vitest'

const executeCanonicalLeagueCreationMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/league-creation/canonical/executeCanonicalLeagueCreation', () => ({
  executeCanonicalLeagueCreation: executeCanonicalLeagueCreationMock,
}))

vi.mock('@/lib/redraft-creation/resolve-app-user-for-league', () => ({
  resolveAppUserIdForLeagueCreate: vi
    .fn()
    .mockResolvedValue({ ok: true, appUserId: 'app-user-1', resolvedVia: 'id' as const }),
}))

vi.mock('next-auth', () => ({
  getServerSession: vi.fn().mockResolvedValue({ user: { id: 'app-user-1' } }),
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

describe('Canonical native league creation pipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    executeCanonicalLeagueCreationMock.mockResolvedValue({
      ok: true,
      response: {
        success: true,
        league: {
          id: 'league-1',
          leagueName: 'Pipeline Test',
          concept: 'redraft',
          sport: 'NFL',
          teamCount: 12,
          draftType: 'snake',
          scoringPreset: 'fb_half_ppr',
          status: 'setup',
          presetKey: 'pk-test',
        },
        homepageUrl: '/league/league-1',
      },
    })
  })

  it('postCreateLeague (POST /api/leagues) resolves through executeCanonicalLeagueCreation', async () => {
    const { postCreateLeague } = await import('@/lib/league-creation/canonical/createLeagueHandler')
    const req = new Request('http://localhost/api/leagues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        concept: 'redraft',
        sport: 'NFL',
        scoringPreset: 'fb_half_ppr',
        teamCount: 12,
        draftType: 'snake',
        leagueName: 'Pipeline Test',
      }),
    })
    const res = await postCreateLeague(req)
    expect(res.status).toBe(200)
    expect(executeCanonicalLeagueCreationMock).toHaveBeenCalledTimes(1)
    expect(executeCanonicalLeagueCreationMock.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        appUserId: 'app-user-1',
        body: expect.objectContaining({
          leagueName: 'Pipeline Test',
          sport: 'NFL',
          teamCount: 12,
        }),
      })
    )
  })
})
