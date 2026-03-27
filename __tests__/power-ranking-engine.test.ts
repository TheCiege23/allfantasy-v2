import { describe, expect, it, vi } from "vitest"

const { mockComputeLeagueRankingsV2 } = vi.hoisted(() => ({
  mockComputeLeagueRankingsV2: vi.fn(),
}))

vi.mock("@/lib/rankings-engine/league-rankings-v2", () => ({
  computeLeagueRankingsV2: mockComputeLeagueRankingsV2,
}))

import { computePowerRankings } from "@/lib/league-power-rankings/PowerRankingEngine"

describe("PowerRankingEngine", () => {
  it("maps v2 rankings into power rankings output", async () => {
    mockComputeLeagueRankingsV2.mockResolvedValue({
      leagueId: "league-1",
      leagueName: "Audit League",
      season: "2026",
      week: 6,
      computedAt: 1710000000,
      weeklyPointsDistribution: [{ rosterId: 7, weeklyPoints: [120, 130, 140, 150] }],
      teams: [
        {
          rosterId: 7,
          ownerId: "owner-7",
          displayName: "Top Team",
          username: "top",
          rank: 1,
          prevRank: 3,
          rankDelta: 2,
          record: { wins: 6, losses: 0, ties: 0 },
          pointsFor: 812.4,
          pointsAgainst: 690.2,
          strengthOfSchedule: 0.57,
          expectedWins: 5.8,
          marketValueScore: 90,
          totalRosterValue: 10300,
          composite: 94.8,
          powerScore: 95,
        },
      ],
    })

    const result = await computePowerRankings("league-1", 6)
    expect(result).not.toBeNull()
    expect(result?.leagueId).toBe("league-1")
    expect(result?.week).toBe(6)
    expect(result?.formula).toMatchObject({
      recordWeight: 0.35,
      recentPerformanceWeight: 0.25,
      rosterStrengthWeight: 0.25,
      projectionStrengthWeight: 0.15,
    })
    expect(result?.teams).toHaveLength(1)
    expect(result?.teams[0]).toMatchObject({
      rosterId: 7,
      rank: 1,
      prevRank: 3,
      rankDelta: 2,
      pointsFor: 812.4,
      composite: 94.8,
      strengthOfSchedule: 0.57,
      expectedWins: 5.8,
      rosterValue: 10300,
      powerScoreBreakdown: expect.objectContaining({
        record: expect.any(Number),
        recentPerformance: expect.any(Number),
        rosterStrength: expect.any(Number),
        projectionStrength: expect.any(Number),
      }),
    })
    expect(result?.teams[0]?.powerScore).toBeGreaterThan(0)
  })

  it("returns null when no teams are available", async () => {
    mockComputeLeagueRankingsV2.mockResolvedValue({
      leagueId: "league-1",
      leagueName: "Audit League",
      season: "2026",
      week: 6,
      computedAt: 1710000000,
      weeklyPointsDistribution: [],
      teams: [],
    })

    const result = await computePowerRankings("league-1", 6)
    expect(result).toBeNull()
  })
})
