/**
 * Phase 2C — StandingsContextProvider tests.
 * Mocks @/lib/prisma so the provider can be exercised without a live DB.
 */

import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  appUserFindUniqueMock,
  leagueTeamFindFirstMock,
  leagueTeamFindManyMock,
} = vi.hoisted(() => ({
  appUserFindUniqueMock: vi.fn(),
  leagueTeamFindFirstMock: vi.fn(),
  leagueTeamFindManyMock: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    appUser: { findUnique: appUserFindUniqueMock },
    leagueTeam: {
      findFirst: leagueTeamFindFirstMock,
      findMany: leagueTeamFindManyMock,
    },
  },
}))

import { StandingsContextProvider } from "@/lib/chimmy-context/providers/StandingsContextProvider"
import type { ChimmyContextRequest } from "@/lib/chimmy-context/types"

function baseRequest(overrides: Partial<ChimmyContextRequest> = {}): ChimmyContextRequest {
  return {
    userId: "user-1",
    leagueId: "league-1",
    perRequestMemo: new Map<string, unknown>(),
    ...overrides,
  }
}

describe("StandingsContextProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    appUserFindUniqueMock.mockResolvedValue({ activeLeagueId: null })
    leagueTeamFindFirstMock.mockResolvedValue({
      id: "team-self",
      teamName: "Self",
      platformUserId: "platform-self",
    })
  })

  it("returns null data when no leagueId can be resolved", async () => {
    const provider = new StandingsContextProvider()
    appUserFindUniqueMock.mockResolvedValueOnce({ activeLeagueId: null })
    const res = await provider.load(baseRequest({ leagueId: null }))
    expect(res.ok).toBe(true)
    expect(res.data).toBeNull()
    expect(leagueTeamFindManyMock).not.toHaveBeenCalled()
  })

  it("maps LeagueTeam rows into StandingsRow shape and preserves order", async () => {
    leagueTeamFindManyMock.mockResolvedValueOnce([
      {
        id: "t-1",
        teamName: "Alpha",
        currentRank: 1,
        wins: 8,
        losses: 2,
        ties: 0,
        pointsFor: 1100.5,
        pointsAgainst: 900,
      },
      {
        id: "t-2",
        teamName: "  ",
        currentRank: 2,
        wins: 6,
        losses: 4,
        ties: 0,
        pointsFor: 950,
        pointsAgainst: 940,
      },
    ])
    const provider = new StandingsContextProvider()
    const res = await provider.load(baseRequest())
    expect(res.ok).toBe(true)
    expect(res.data?.leagueId).toBe("league-1")
    expect(res.data?.rows).toHaveLength(2)
    expect(res.data?.rows[0]).toMatchObject({
      teamId: "t-1",
      teamName: "Alpha",
      rank: 1,
      wins: 8,
      losses: 2,
      pointsFor: 1100.5,
      pointsAgainst: 900,
    })
    // Empty/whitespace team names collapse to null.
    expect(res.data?.rows[1].teamName).toBeNull()
  })

  it("returns empty rows + ok:false when Prisma findMany rejects", async () => {
    leagueTeamFindManyMock.mockRejectedValueOnce(new Error("boom"))
    const provider = new StandingsContextProvider()
    const res = await provider.load(baseRequest())
    expect(res.ok).toBe(false)
    expect(res.data?.rows).toEqual([])
    expect(res.error).toBe("Standings query failed")
  })

  it("falls back to appUser.activeLeagueId when request.leagueId missing", async () => {
    appUserFindUniqueMock.mockResolvedValueOnce({ activeLeagueId: "league-active" })
    leagueTeamFindManyMock.mockResolvedValueOnce([])
    const provider = new StandingsContextProvider()
    const res = await provider.load(baseRequest({ leagueId: null }))
    expect(res.ok).toBe(true)
    expect(res.data?.leagueId).toBe("league-active")
    expect(res.data?.rows).toEqual([])
  })

  it("never throws even when Prisma identity lookup explodes", async () => {
    leagueTeamFindFirstMock.mockRejectedValueOnce(new Error("identity boom"))
    leagueTeamFindManyMock.mockResolvedValueOnce([])
    const provider = new StandingsContextProvider()
    const res = await provider.load(baseRequest())
    // identity resolves to null teamId but leagueId still set; provider proceeds.
    expect(res.ok).toBe(true)
    expect(res.data?.leagueId).toBe("league-1")
  })
})
