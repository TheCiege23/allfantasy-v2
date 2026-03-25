import { describe, expect, it, vi } from "vitest"
import type { ResolvedPlayerStats } from "@/lib/player-comparison-lab/types"

vi.mock("@/lib/player-comparison-lab/PlayerStatsResolver", () => ({
  resolvePlayerStats: vi.fn(),
}))

import { comparePlayers } from "@/lib/player-comparison-lab/PlayerComparisonService"
import { resolvePlayerStats } from "@/lib/player-comparison-lab/PlayerStatsResolver"

const mockedResolvePlayerStats = vi.mocked(resolvePlayerStats)

function buildPlayer(
  name: string,
  values: {
    value: number
    rank: number
    trend30Day: number
    fantasyPointsPerGame: number
    totalFantasyPoints: number
  }
): ResolvedPlayerStats {
  return {
    name,
    position: "QB",
    team: "TEAM",
    historical: [
      {
        season: "2024",
        gamesPlayed: 17,
        fantasyPoints: values.totalFantasyPoints,
        fantasyPointsPerGame: values.fantasyPointsPerGame,
      },
    ],
    projection: {
      value: values.value,
      rank: values.rank,
      positionRank: values.rank,
      trend30Day: values.trend30Day,
      redraftValue: null,
      source: "fantasycalc",
      position: "QB",
      team: "TEAM",
      volatility: 12,
    },
  }
}

describe("PlayerComparisonService", () => {
  it("builds chart series and summary with correct comparison direction", async () => {
    mockedResolvePlayerStats.mockResolvedValueOnce(
      buildPlayer("Josh Allen", {
        value: 9200,
        rank: 5,
        trend30Day: 180,
        fantasyPointsPerGame: 24.3,
        totalFantasyPoints: 413.1,
      })
    )
    mockedResolvePlayerStats.mockResolvedValueOnce(
      buildPlayer("Jalen Hurts", {
        value: 8700,
        rank: 20,
        trend30Day: 120,
        fantasyPointsPerGame: 20.1,
        totalFantasyPoints: 341.7,
      })
    )

    const result = await comparePlayers("Josh Allen", "Jalen Hurts")
    expect(result).not.toBeNull()

    const chartLabels = result!.chartSeries.map((s) => s.label)
    expect(chartLabels).toContain("Dynasty value")
    expect(chartLabels).toContain("Overall rank")
    expect(chartLabels).toContain("30-day trend")
    expect(chartLabels.some((label) => label.startsWith("FP/Game"))).toBe(true)

    const summary = result!.summaryLines.join(" ")
    expect(summary).toContain("higher dynasty value by 500")
    expect(summary).toContain("ranked 15 spots higher overall (#5 vs #20)")
    expect(summary).toContain("Josh Allen had 4.2 more FP/Game")
  })

  it("returns null when one player cannot be resolved", async () => {
    mockedResolvePlayerStats.mockResolvedValueOnce(null)
    mockedResolvePlayerStats.mockResolvedValueOnce(
      buildPlayer("Jalen Hurts", {
        value: 8700,
        rank: 20,
        trend30Day: 120,
        fantasyPointsPerGame: 20.1,
        totalFantasyPoints: 341.7,
      })
    )

    const result = await comparePlayers("Unknown", "Jalen Hurts")
    expect(result).toBeNull()
  })
})
