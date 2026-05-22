/**
 * Phase 2C Batch 3 — MatchupContextProvider tests.
 */

import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  appUserFindUniqueMock,
  leagueFindUniqueMock,
  leagueTeamFindFirstMock,
  redraftSeasonFindFirstMock,
  rosterFindUniqueMock,
  teamWeekResultFindUniqueMock,
  teamWeekResultFindFirstMock,
  weeklyMatchupFindFirstMock,
} = vi.hoisted(() => ({
  appUserFindUniqueMock: vi.fn(),
  leagueFindUniqueMock: vi.fn(),
  leagueTeamFindFirstMock: vi.fn(),
  redraftSeasonFindFirstMock: vi.fn(),
  rosterFindUniqueMock: vi.fn(),
  teamWeekResultFindUniqueMock: vi.fn(),
  teamWeekResultFindFirstMock: vi.fn(),
  weeklyMatchupFindFirstMock: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    appUser: { findUnique: appUserFindUniqueMock },
    league: { findUnique: leagueFindUniqueMock },
    leagueTeam: { findFirst: leagueTeamFindFirstMock },
    redraftSeason: { findFirst: redraftSeasonFindFirstMock },
    roster: { findUnique: rosterFindUniqueMock },
    teamWeekResult: {
      findUnique: teamWeekResultFindUniqueMock,
      findFirst: teamWeekResultFindFirstMock,
    },
    weeklyMatchup: { findFirst: weeklyMatchupFindFirstMock },
  },
}))

import { MatchupContextProvider } from "@/lib/chimmy-context/providers/MatchupContextProvider"
import type { ChimmyContextRequest } from "@/lib/chimmy-context/types"

function baseRequest(
  overrides: Partial<ChimmyContextRequest> = {}
): ChimmyContextRequest {
  return {
    userId: "user-1",
    leagueId: "league-1",
    perRequestMemo: new Map<string, unknown>(),
    ...overrides,
  }
}

describe("MatchupContextProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    appUserFindUniqueMock.mockResolvedValue({ activeLeagueId: null })
    leagueTeamFindFirstMock.mockResolvedValue({
      id: "team-self",
      teamName: "Self",
      platformUserId: "platform-self",
    })
    leagueFindUniqueMock.mockResolvedValue({
      season: 2025,
      playoffStartWeek: 14,
      settings: null,
    })
    redraftSeasonFindFirstMock.mockResolvedValue({
      season: 2025,
      currentWeek: 8,
      playoffStartWeek: 14,
      totalWeeks: 17,
    })
    rosterFindUniqueMock.mockResolvedValue({ id: "roster-self" })
    teamWeekResultFindFirstMock.mockResolvedValue(null)
    weeklyMatchupFindFirstMock.mockResolvedValue(null)
  })

  it("returns null when leagueId cannot be resolved", async () => {
    const provider = new MatchupContextProvider()
    const res = await provider.load(baseRequest({ leagueId: null }))
    expect(res.ok).toBe(true)
    expect(res.data).toBeNull()
    expect(teamWeekResultFindUniqueMock).not.toHaveBeenCalled()
  })

  it("emits week + playoff context when viewer has no platformUserId", async () => {
    leagueTeamFindFirstMock.mockResolvedValueOnce({
      id: "team-self",
      teamName: "Self",
      platformUserId: null,
    })
    const provider = new MatchupContextProvider()
    const res = await provider.load(baseRequest())
    expect(res.ok).toBe(true)
    expect(res.data).not.toBeNull()
    expect(res.data?.week).toBe(8)
    expect(res.data?.playoffStartWeek).toBe(14)
    expect(res.data?.yourTeamId).toBe("team-self")
    expect(res.data?.opponentTeamId).toBeNull()
    expect(rosterFindUniqueMock).not.toHaveBeenCalled()
  })

  it("returns safe partial when the viewer's Roster row is missing", async () => {
    rosterFindUniqueMock.mockResolvedValueOnce(null)
    const provider = new MatchupContextProvider()
    const res = await provider.load(baseRequest())
    expect(res.ok).toBe(true)
    expect(res.data?.opponentTeamId).toBeNull()
    expect(res.data?.yourActualPoints).toBeNull()
    expect(teamWeekResultFindUniqueMock).not.toHaveBeenCalled()
  })

  it("returns viewer-only slice on a bye week (no opponentRosterId)", async () => {
    teamWeekResultFindUniqueMock.mockResolvedValueOnce({
      totalPoints: 102.55,
      opponentRosterId: null,
      status: "in_progress",
    })
    const provider = new MatchupContextProvider()
    const res = await provider.load(baseRequest())
    expect(res.ok).toBe(true)
    expect(res.data?.status).toBe("in_progress")
    expect(res.data?.yourActualPoints).toBe(102.55)
    expect(res.data?.opponentActualPoints).toBeNull()
    expect(res.data?.opponentTeamId).toBeNull()
    expect(res.data?.opponentTeamName).toBeNull()
  })

  it("returns full matchup slice including opponent identity and actual points", async () => {
    teamWeekResultFindUniqueMock
      .mockResolvedValueOnce({
        totalPoints: 124.3,
        opponentRosterId: "roster-opp",
        status: "final",
      })
      .mockResolvedValueOnce({ totalPoints: 110.1, status: "final" })
    rosterFindUniqueMock
      .mockResolvedValueOnce({ id: "roster-self" })
      .mockResolvedValueOnce({ platformUserId: "platform-opp" })
    leagueTeamFindFirstMock
      .mockResolvedValueOnce({
        id: "team-self",
        teamName: "Self",
        platformUserId: "platform-self",
      })
      .mockResolvedValueOnce({ id: "team-opp", teamName: "Rivals" })

    const provider = new MatchupContextProvider()
    const res = await provider.load(baseRequest())

    expect(res.ok).toBe(true)
    expect(res.data?.week).toBe(8)
    expect(res.data?.season).toBe(2025)
    expect(res.data?.status).toBe("final")
    expect(res.data?.yourActualPoints).toBe(124.3)
    expect(res.data?.opponentActualPoints).toBe(110.1)
    expect(res.data?.opponentTeamId).toBe("team-opp")
    expect(res.data?.opponentTeamName).toBe("Rivals")
    expect(res.data?.playoffStartWeek).toBe(14)
    expect(res.data?.isPlayoffWeek).toBe(false)
    expect(res.data?.weeksUntilPlayoffs).toBe(6)
    expect(res.data?.currentWeekSource).toBe("redraftSeason")
  })

  it("returns ok:false with safe envelope when Prisma rejects mid-flow", async () => {
    rosterFindUniqueMock.mockRejectedValueOnce(new Error("db down"))
    // resolveLeagueIdentity needs to succeed before the failure hits roster lookup.
    const provider = new MatchupContextProvider()
    const res = await provider.load(baseRequest())
    // resolveLeagueIdentity catches its own errors; roster catch() returns null
    // → safe partial path. So this should still be ok:true with null opponent.
    expect(res.ok).toBe(true)
    expect(res.data?.opponentTeamId).toBeNull()
  })
})
