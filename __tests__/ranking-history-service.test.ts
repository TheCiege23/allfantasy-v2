import { beforeEach, describe, expect, it, vi } from "vitest"

const { mockGetRankHistory, mockGetPreviousWeekSnapshots } = vi.hoisted(() => ({
  mockGetRankHistory: vi.fn(),
  mockGetPreviousWeekSnapshots: vi.fn(),
}))

vi.mock("@/lib/rankings-engine/snapshots", () => ({
  getRankHistory: mockGetRankHistory,
  getPreviousWeekSnapshots: mockGetPreviousWeekSnapshots,
}))

import {
  getPreviousWeekRanks,
  getWeeklyRankHistory,
} from "@/lib/league-power-rankings/RankingHistoryService"

describe("RankingHistoryService", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("maps weekly rank history rows", async () => {
    mockGetRankHistory.mockResolvedValue([
      { season: "2026", week: 8, rank: 2, composite: "89.4" },
      { season: "2026", week: 7, rank: 4, composite: 81.2 },
    ])

    const rows = await getWeeklyRankHistory("league-1", "3", 10)
    expect(rows).toEqual([
      { season: "2026", week: 8, rank: 2, composite: 89.4 },
      { season: "2026", week: 7, rank: 4, composite: 81.2 },
    ])
    expect(mockGetRankHistory).toHaveBeenCalledWith({
      leagueId: "league-1",
      rosterId: "3",
      limit: 10,
    })
  })

  it("maps previous week snapshots to simplified map", async () => {
    mockGetPreviousWeekSnapshots.mockResolvedValue(
      new Map([
        ["1", { rank: 2, composite: 88.1 }],
        ["2", { rank: 5, composite: 73.4 }],
      ])
    )

    const map = await getPreviousWeekRanks("league-1", "2026", 9)
    expect(map.get("1")).toEqual({ rank: 2, composite: 88.1 })
    expect(map.get("2")).toEqual({ rank: 5, composite: 73.4 })
  })
})
