import { describe, expect, it } from "vitest"
import { buildPlayoffTemplate, getPlayoffRoundOrder } from "@/lib/playoffs/playoffTemplate"

describe("playoff template", () => {
  it("builds a 16-team, 4-round bracket tree", () => {
    const template = buildPlayoffTemplate({ sport: "nba", seasonYear: 2026, isTestMode: false })

    expect(template).toHaveLength(15)
    expect(template.filter((series) => series.round === "round_1")).toHaveLength(8)
    expect(template.filter((series) => series.round === "conference_semifinals")).toHaveLength(4)
    expect(template.filter((series) => series.round === "conference_finals")).toHaveLength(2)
    expect(template.filter((series) => series.round === "finals")).toHaveLength(1)

    const finals = template.find((series) => series.seriesNumber === 15)
    expect(finals?.sourceSeriesHome).toBe(13)
    expect(finals?.sourceSeriesAway).toBe(14)
  })

  it("seeds named teams in test mode", () => {
    const nba = buildPlayoffTemplate({ sport: "nba", seasonYear: 2026, isTestMode: true })
    const nhl = buildPlayoffTemplate({ sport: "nhl", seasonYear: 2026, isTestMode: true })

    expect(nba[0]?.homeTeamName).toBe("Celtics")
    expect(nhl[0]?.homeTeamName).toBe("Rangers")
  })

  it("exposes round order for reusable boards", () => {
    expect(getPlayoffRoundOrder()).toEqual([
      "round_1",
      "conference_semifinals",
      "conference_finals",
      "finals",
    ])
  })
})
