/**
 * Phase 2C — RosterContextProvider tests.
 * Mocks @/lib/prisma and exercises the playerData → starters/bench projection.
 */

import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  appUserFindUniqueMock,
  leagueTeamFindFirstMock,
  rosterFindUniqueMock,
} = vi.hoisted(() => ({
  appUserFindUniqueMock: vi.fn(),
  leagueTeamFindFirstMock: vi.fn(),
  rosterFindUniqueMock: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    appUser: { findUnique: appUserFindUniqueMock },
    leagueTeam: { findFirst: leagueTeamFindFirstMock },
    roster: { findUnique: rosterFindUniqueMock },
  },
}))

import { RosterContextProvider } from "@/lib/chimmy-context/providers/RosterContextProvider"
import type { ChimmyContextRequest } from "@/lib/chimmy-context/types"

function baseRequest(overrides: Partial<ChimmyContextRequest> = {}): ChimmyContextRequest {
  return {
    userId: "user-1",
    leagueId: "league-1",
    perRequestMemo: new Map<string, unknown>(),
    ...overrides,
  }
}

describe("RosterContextProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    appUserFindUniqueMock.mockResolvedValue({ activeLeagueId: null })
    leagueTeamFindFirstMock.mockResolvedValue({
      id: "team-self",
      teamName: "Self",
      platformUserId: "platform-self",
    })
  })

  it("returns null data when leagueId cannot be resolved", async () => {
    const provider = new RosterContextProvider()
    const res = await provider.load(baseRequest({ leagueId: null }))
    expect(res.ok).toBe(true)
    expect(res.data).toBeNull()
    expect(rosterFindUniqueMock).not.toHaveBeenCalled()
  })

  it("returns empty starters/bench when viewer has no platformUserId in this league", async () => {
    leagueTeamFindFirstMock.mockResolvedValueOnce({
      id: "team-self",
      teamName: "Self",
      platformUserId: null,
    })
    const provider = new RosterContextProvider()
    const res = await provider.load(baseRequest())
    expect(res.ok).toBe(true)
    expect(res.data).toEqual({
      leagueId: "league-1",
      teamId: "team-self",
      starters: [],
      bench: [],
    })
    expect(rosterFindUniqueMock).not.toHaveBeenCalled()
  })

  it("returns empty starters/bench when the Roster row is missing", async () => {
    rosterFindUniqueMock.mockResolvedValueOnce(null)
    const provider = new RosterContextProvider()
    const res = await provider.load(baseRequest())
    expect(res.ok).toBe(true)
    expect(res.data?.starters).toEqual([])
    expect(res.data?.bench).toEqual([])
  })

  it("projects playerData.lineup_sections into RosterPlayerLite[]", async () => {
    rosterFindUniqueMock.mockResolvedValueOnce({
      playerData: {
        lineup_sections: {
          starters: [
            { id: "p-qb", name: "Patrick Mahomes", position: "QB", team: "kc", slot: "QB" },
            { id: "p-rb1", full_name: "Christian McCaffrey", position: "rb", team: "sf" },
          ],
          bench: [{ id: "p-rb2", position: "RB", name: "Tony Pollard" }],
          ir: [{ id: "p-wr-ir", position: "WR", name: "Cooper Kupp" }],
          taxi: [],
          devy: [],
        },
      },
    })
    const provider = new RosterContextProvider()
    const res = await provider.load(baseRequest())
    expect(res.ok).toBe(true)
    expect(res.data?.starters).toHaveLength(2)
    expect(res.data?.starters[0]).toMatchObject({
      playerId: "p-qb",
      name: "Patrick Mahomes",
      position: "QB",
      team: "KC",
      slot: "QB",
    })
    expect(res.data?.starters[1]).toMatchObject({
      playerId: "p-rb1",
      name: "Christian McCaffrey",
      position: "RB",
      team: "SF",
    })
    // bench merges true bench + ir + taxi + devy
    expect(res.data?.bench.map((p) => p.playerId)).toEqual(["p-rb2", "p-wr-ir"])
  })

  it("falls back name=playerId when name is missing", async () => {
    rosterFindUniqueMock.mockResolvedValueOnce({
      playerData: {
        lineup_sections: {
          starters: [{ id: "p-nameless", position: "WR" }],
          bench: [],
          ir: [],
          taxi: [],
          devy: [],
        },
      },
    })
    const provider = new RosterContextProvider()
    const res = await provider.load(baseRequest())
    expect(res.data?.starters[0].name).toBe("p-nameless")
  })

  it("returns ok:false with null data when Roster.findUnique throws synchronously", async () => {
    rosterFindUniqueMock.mockImplementationOnce(() => {
      throw new Error("sync boom")
    })
    const provider = new RosterContextProvider()
    const res = await provider.load(baseRequest())
    expect(res.ok).toBe(false)
    expect(res.data).toBeNull()
    expect(res.error).toBe("sync boom")
  })
})
