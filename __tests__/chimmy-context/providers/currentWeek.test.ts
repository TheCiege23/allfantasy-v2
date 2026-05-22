/**
 * Phase 2C Batch 3 — currentWeek resolver tests.
 */

import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  leagueFindUniqueMock,
  redraftSeasonFindFirstMock,
  teamWeekResultFindFirstMock,
  weeklyMatchupFindFirstMock,
} = vi.hoisted(() => ({
  leagueFindUniqueMock: vi.fn(),
  redraftSeasonFindFirstMock: vi.fn(),
  teamWeekResultFindFirstMock: vi.fn(),
  weeklyMatchupFindFirstMock: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    league: { findUnique: leagueFindUniqueMock },
    redraftSeason: { findFirst: redraftSeasonFindFirstMock },
    teamWeekResult: { findFirst: teamWeekResultFindFirstMock },
    weeklyMatchup: { findFirst: weeklyMatchupFindFirstMock },
  },
}))

import { resolveCurrentWeek } from "@/lib/chimmy-context/providers/_helpers/currentWeek"

describe("resolveCurrentWeek", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    leagueFindUniqueMock.mockResolvedValue({
      season: 2025,
      playoffStartWeek: 14,
      settings: null,
    })
    redraftSeasonFindFirstMock.mockResolvedValue(null)
    teamWeekResultFindFirstMock.mockResolvedValue(null)
    weeklyMatchupFindFirstMock.mockResolvedValue(null)
  })

  it("uses explicit request override and skips DB derivation", async () => {
    const res = await resolveCurrentWeek({ leagueId: "L", week: 7 })
    expect(res.week).toBe(7)
    expect(res.source).toBe("requestOverride")
    expect(res.season).toBe(2025)
    expect(teamWeekResultFindFirstMock).not.toHaveBeenCalled()
  })

  it("prefers RedraftSeason.currentWeek over downstream sources", async () => {
    redraftSeasonFindFirstMock.mockResolvedValue({
      season: 2025,
      currentWeek: 9,
      playoffStartWeek: 15,
      totalWeeks: 17,
    })
    const res = await resolveCurrentWeek({ leagueId: "L" })
    expect(res.week).toBe(9)
    expect(res.source).toBe("redraftSeason")
    expect(res.playoffStartWeek).toBe(15)
    expect(res.isPlayoffWeek).toBe(false)
    expect(res.weeksUntilPlayoffs).toBe(6)
    expect(teamWeekResultFindFirstMock).not.toHaveBeenCalled()
  })

  it("derives from TeamWeekResult MAX(week, status='final') + 1", async () => {
    teamWeekResultFindFirstMock.mockResolvedValue({ week: 5 })
    const res = await resolveCurrentWeek({ leagueId: "L" })
    expect(res.week).toBe(6)
    expect(res.source).toBe("teamWeekResult")
  })

  it("derives from WeeklyMatchup when TeamWeekResult is empty", async () => {
    weeklyMatchupFindFirstMock.mockResolvedValue({ week: 3 })
    const res = await resolveCurrentWeek({ leagueId: "L" })
    expect(res.week).toBe(4)
    expect(res.source).toBe("weeklyMatchup")
  })

  it("falls back to league.settings.leg (Sleeper) when no scored data", async () => {
    leagueFindUniqueMock.mockResolvedValue({
      season: 2025,
      playoffStartWeek: 14,
      settings: { leg: 11 },
    })
    const res = await resolveCurrentWeek({ leagueId: "L" })
    expect(res.week).toBe(11)
    expect(res.source).toBe("leagueSettings")
  })

  it("falls back to week=1 when all sources fail", async () => {
    const res = await resolveCurrentWeek({ leagueId: "L" })
    expect(res.week).toBe(1)
    expect(res.source).toBe("fallback")
    expect(res.playoffStartWeek).toBe(14)
    expect(res.isPlayoffWeek).toBe(false)
    expect(res.weeksUntilPlayoffs).toBe(13)
  })

  it("flags playoff week when week >= playoffStartWeek", async () => {
    teamWeekResultFindFirstMock.mockResolvedValue({ week: 14 })
    const res = await resolveCurrentWeek({ leagueId: "L" })
    expect(res.week).toBe(15)
    expect(res.isPlayoffWeek).toBe(true)
    expect(res.weeksUntilPlayoffs).toBe(0)
  })

  it("memoises results on the supplied memo when no overrides given", async () => {
    teamWeekResultFindFirstMock.mockResolvedValue({ week: 4 })
    const memo = new Map<string, unknown>()
    const first = await resolveCurrentWeek({ leagueId: "L", memo })
    const second = await resolveCurrentWeek({ leagueId: "L", memo })
    expect(first).toBe(second)
    expect(leagueFindUniqueMock).toHaveBeenCalledTimes(1)
  })

  it("never throws when Prisma rejects", async () => {
    leagueFindUniqueMock.mockRejectedValue(new Error("boom"))
    redraftSeasonFindFirstMock.mockRejectedValue(new Error("boom"))
    teamWeekResultFindFirstMock.mockRejectedValue(new Error("boom"))
    weeklyMatchupFindFirstMock.mockRejectedValue(new Error("boom"))
    const res = await resolveCurrentWeek({ leagueId: "L" })
    expect(res.week).toBe(1)
    expect(res.source).toBe("fallback")
  })
})
