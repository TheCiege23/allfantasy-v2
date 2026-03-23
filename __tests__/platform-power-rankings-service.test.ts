import { beforeEach, describe, expect, it, vi } from 'vitest'

const legacyScoreRecordFindManyMock = vi.fn()
const managerFranchiseProfileFindManyMock = vi.fn()
const managerXPProfileFindManyMock = vi.fn()
const userProfileFindManyMock = vi.fn()
const appUserFindManyMock = vi.fn()

vi.mock('@/lib/prisma', () => ({
  prisma: {
    legacyScoreRecord: { findMany: legacyScoreRecordFindManyMock },
    managerFranchiseProfile: { findMany: managerFranchiseProfileFindManyMock },
    managerXPProfile: { findMany: managerXPProfileFindManyMock },
    userProfile: { findMany: userProfileFindManyMock },
    appUser: { findMany: appUserFindManyMock },
  },
}))

describe('PlatformPowerRankingsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    userProfileFindManyMock.mockResolvedValue([
      { userId: 'm1', sleeperUserId: null, displayName: 'Manager One' },
    ])
    appUserFindManyMock.mockResolvedValue([
      { id: 'm2', displayName: null, username: 'manager_two' },
    ])
  })

  it('builds weighted cross-league ranking rows with display names', async () => {
    const { getPlatformPowerLeaderboard } = await import(
      '@/lib/platform-power-rankings/PlatformPowerRankingsService'
    )

    legacyScoreRecordFindManyMock.mockResolvedValue([
      { entityId: 'm1', overallLegacyScore: 80 },
      { entityId: 'm2', overallLegacyScore: 60 },
    ])
    managerFranchiseProfileFindManyMock.mockResolvedValue([
      { managerId: 'm1', championshipCount: 2, careerWinPercentage: 55, totalLeaguesPlayed: 10 },
      { managerId: 'm2', championshipCount: 5, careerWinPercentage: 48, totalLeaguesPlayed: 12 },
    ])
    managerXPProfileFindManyMock.mockResolvedValue([
      { managerId: 'm1', totalXP: 3000 },
      { managerId: 'm2', totalXP: 1000 },
    ])

    const result = await getPlatformPowerLeaderboard({ limit: 10, offset: 0 })

    expect(result.total).toBe(2)
    expect(result.rows[0]).toEqual(
      expect.objectContaining({
        managerId: 'm1',
        rank: 1,
        displayName: 'Manager One',
      })
    )
    expect(result.rows[1]).toEqual(
      expect.objectContaining({
        managerId: 'm2',
        rank: 2,
        displayName: 'manager_two',
      })
    )
    expect(result.rows[0]!.powerScore).toBeGreaterThan(result.rows[1]!.powerScore)
  })

  it('applies sport filter to legacy data and clamps pagination inputs', async () => {
    const { getPlatformPowerLeaderboard } = await import(
      '@/lib/platform-power-rankings/PlatformPowerRankingsService'
    )

    legacyScoreRecordFindManyMock.mockResolvedValue([])
    managerFranchiseProfileFindManyMock.mockResolvedValue([])
    managerXPProfileFindManyMock.mockResolvedValue([])

    await getPlatformPowerLeaderboard({ sport: 'soccer', limit: 1000, offset: -5 })

    expect(legacyScoreRecordFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          entityType: 'MANAGER',
          sport: 'SOCCER',
        }),
      })
    )
  })
})
