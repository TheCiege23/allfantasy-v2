import { beforeEach, describe, expect, it, vi } from "vitest"

const userProfileFindManyMock = vi.fn()
const appUserFindManyMock = vi.fn()
const leagueFindManyMock = vi.fn()
const leagueCountMock = vi.fn()

vi.mock("@/lib/prisma", () => ({
  prisma: {
    userProfile: {
      findMany: userProfileFindManyMock,
    },
    appUser: {
      findMany: appUserFindManyMock,
    },
    league: {
      findMany: leagueFindManyMock,
      count: leagueCountMock,
    },
  },
}))

describe("LeagueSearchService", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it("returns empty result without filters to avoid full-table scans", async () => {
    const { searchLeagues } = await import("@/lib/league-search")
    const result = await searchLeagues({})
    expect(result).toEqual({
      hits: [],
      total: 0,
      limit: 50,
      offset: 0,
    })
    expect(leagueFindManyMock).not.toHaveBeenCalled()
    expect(leagueCountMock).not.toHaveBeenCalled()
  })

  it("searches by commissioner across profile + app user identities", async () => {
    userProfileFindManyMock.mockResolvedValueOnce([{ userId: "user-profile-1" }])
    appUserFindManyMock.mockResolvedValueOnce([{ id: "app-user-2" }])
    leagueFindManyMock.mockResolvedValueOnce([
      {
        id: "league-1",
        name: "Dynasty Elite",
        sport: "NFL",
        leagueVariant: "DYNASTY",
        isDynasty: true,
        season: 2026,
        leagueSize: 12,
        userId: "user-profile-1",
        platform: "sleeper",
        platformLeagueId: "123",
        user: { displayName: "Comm One", username: "comm1", profile: { displayName: "Comm One" } },
      },
    ])
    leagueCountMock.mockResolvedValueOnce(1)

    const { searchLeagues } = await import("@/lib/league-search")
    const result = await searchLeagues({ commissioner: "comm", limit: 10, offset: 0 })

    expect(userProfileFindManyMock).toHaveBeenCalled()
    expect(appUserFindManyMock).toHaveBeenCalled()
    expect(leagueFindManyMock).toHaveBeenCalled()
    const leagueWhere = leagueFindManyMock.mock.calls[0]?.[0]?.where
    expect(leagueWhere).toEqual({
      userId: {
        in: expect.arrayContaining(["user-profile-1", "app-user-2"]),
      },
    })
    expect(result.total).toBe(1)
    expect(result.hits[0]?.commissionerName).toBe("Comm One")
  })

  it("normalizes invalid limit/offset and caches repeated queries", async () => {
    leagueFindManyMock.mockResolvedValueOnce([
      {
        id: "league-2",
        name: "Fast Search League",
        sport: "NBA",
        leagueVariant: "redraft",
        isDynasty: false,
        season: 2026,
        leagueSize: 10,
        userId: "owner-2",
        platform: "espn",
        platformLeagueId: "abc",
        user: { displayName: "Owner Two", username: "owner2", profile: null },
      },
    ])
    leagueCountMock.mockResolvedValueOnce(1)

    const { searchLeagues } = await import("@/lib/league-search")
    const first = await searchLeagues({
      leagueName: "Fast",
      limit: Number.NaN as unknown as number,
      offset: Number.NaN as unknown as number,
    })
    const second = await searchLeagues({
      leagueName: "Fast",
      limit: Number.NaN as unknown as number,
      offset: Number.NaN as unknown as number,
    })

    expect(leagueFindManyMock).toHaveBeenCalledTimes(1)
    expect(leagueCountMock).toHaveBeenCalledTimes(1)
    expect(first.limit).toBe(50)
    expect(first.offset).toBe(0)
    expect(second.hits[0]?.id).toBe("league-2")
  })
})
