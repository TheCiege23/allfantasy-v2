import { beforeEach, describe, expect, it, vi } from 'vitest'

const leagueFindUniqueMock = vi.fn()
const leagueUpdateMock = vi.fn()

vi.mock('@/lib/prisma', () => ({
  prisma: {
    league: {
      findUnique: leagueFindUniqueMock,
      update: leagueUpdateMock,
    },
  },
}))

describe('CommissionerSettingsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns sport + leagueVariant context in general configuration payload', async () => {
    leagueFindUniqueMock.mockResolvedValue({
      id: 'league-1',
      name: 'Soccer Strategy League',
      sport: 'SOCCER',
      leagueVariant: 'STANDARD',
      season: 2026,
      leagueSize: 12,
      rosterSize: 15,
      starters: { GKP: 1, DEF: 4, MID: 4, FWD: 2 },
      settings: {
        description: 'League for soccer defaults',
      },
    })

    const { getLeagueConfiguration } = await import('@/lib/commissioner-settings/CommissionerSettingsService')
    const config = await getLeagueConfiguration('league-1')

    expect(config).toMatchObject({
      id: 'league-1',
      sport: 'SOCCER',
      leagueVariant: 'STANDARD',
      description: 'League for soccer defaults',
    })
  })
})
