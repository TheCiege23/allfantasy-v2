import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  getServerSessionMock,
  computeLeagueCountMock,
  createTournamentMock,
  validateCommissionerLeagueNamesMock,
} = vi.hoisted(() => ({
  getServerSessionMock: vi.fn(),
  computeLeagueCountMock: vi.fn(),
  createTournamentMock: vi.fn(),
  validateCommissionerLeagueNamesMock: vi.fn(),
}))

vi.mock('next-auth', () => ({
  getServerSession: getServerSessionMock,
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/lib/tournament-mode/TournamentCreationService', () => ({
  computeLeagueCount: computeLeagueCountMock,
  createTournament: createTournamentMock,
}))

vi.mock('@/lib/tournament-mode/LeagueNamingService', () => ({
  validateCommissionerLeagueNames: validateCommissionerLeagueNamesMock,
}))

import { POST } from '@/app/api/tournament/create/route'

function buildRequest(body: Record<string, unknown>) {
  return new Request('http://localhost:3000/api/tournament/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/tournament/create', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getServerSessionMock.mockResolvedValue({ user: { id: 'commissioner-1' } })
    computeLeagueCountMock.mockReturnValue(5)
    createTournamentMock.mockResolvedValue({
      tournamentId: 't-1',
      leagueIds: ['league-1'],
      inviteDistribution: [],
      conferenceNames: ['Black', 'Gold'],
    })
    validateCommissionerLeagueNamesMock.mockReturnValue({ valid: true, errors: [] })
  })

  it('rejects unsupported sports before tournament creation', async () => {
    const response = await POST(buildRequest({
      name: 'Bad Sport Tournament',
      sport: 'CRICKET',
      settings: { participantPoolSize: 64, draftType: 'snake' },
    }))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: 'Sport must be one of: NFL, NBA, MLB, NHL, NCAAF, NCAAB, SOCCER',
    })
    expect(createTournamentMock).not.toHaveBeenCalled()
  })

  it('rejects unsupported draft types before tournament creation', async () => {
    const response = await POST(buildRequest({
      name: 'Bad Draft Tournament',
      sport: 'NFL',
      settings: { participantPoolSize: 64, draftType: 'salary_cap' },
    }))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: 'Draft type must be snake or auction',
    })
    expect(createTournamentMock).not.toHaveBeenCalled()
  })

  it('accepts expanded pool sizes and normalizes linear draft to snake', async () => {
    const response = await POST(buildRequest({
      name: 'Expanded Tournament',
      sport: 'NFL',
      settings: { participantPoolSize: 64, draftType: 'linear' },
    }))

    expect(response.status).toBe(200)
    expect(computeLeagueCountMock).toHaveBeenCalledWith(64, 12)
    expect(createTournamentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sport: 'NFL',
        settings: expect.objectContaining({
          participantPoolSize: 64,
          draftType: 'snake',
          initialLeagueSize: 12,
        }),
      })
    )
  })
})