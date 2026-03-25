import { describe, expect, it } from "vitest"
import { getStrategyRecommendation } from "@/lib/fantasy-coach/StrategyRecommendationEngine"

describe("StrategyRecommendationEngine", () => {
  it("returns lineup recommendation with lineup-specific guidance", async () => {
    const result = await getStrategyRecommendation("lineup", {
      leagueName: "Test League",
      week: 7,
      teamName: "Alpha",
      sport: "nfl",
    })

    expect(result.type).toBe("lineup")
    expect(result.summary.toLowerCase()).toContain("start")
    expect(result.bullets.join(" ").toLowerCase()).toContain("matchup")
    expect(result.contextSummary).toContain("Sport: NFL")
    expect(result.contextSummary).toContain("Week 7")
  })

  it("returns trade recommendation with trade-specific guidance", async () => {
    const result = await getStrategyRecommendation("trade", { teamName: "Bravo" })

    expect(result.type).toBe("trade")
    expect(result.summary.toLowerCase()).toContain("fair-value")
    expect(result.bullets.join(" ").toLowerCase()).toContain("sell high")
    expect(result.actions.length).toBeGreaterThan(0)
  })

  it("returns waiver recommendation with waiver-specific guidance", async () => {
    const result = await getStrategyRecommendation("waiver", { leagueId: "league-1" })

    expect(result.type).toBe("waiver")
    expect(result.summary.toLowerCase()).toContain("handcuffs")
    expect(result.bullets.join(" ").toLowerCase()).toContain("faab")
    expect(result.actions.length).toBeGreaterThan(0)
  })
})
