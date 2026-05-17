import { describe, expect, it } from "vitest"
import { scorePlayoffEntryPicks } from "@/lib/playoffs/playoffScoring"

describe("playoff scoring", () => {
  it("scores correct and incorrect completed series picks differently", () => {
    const series = [{ id: "series-1", winnerTeamName: "Celtics" }]

    expect(scorePlayoffEntryPicks(series, [{ seriesId: "series-1", pickTeamName: "Celtics" }])).toEqual({
      totalScore: 1,
      correctPicks: 1,
      resolvedPicks: 1,
    })
    expect(scorePlayoffEntryPicks(series, [{ seriesId: "series-1", pickTeamName: "Heat" }])).toEqual({
      totalScore: 0,
      correctPicks: 0,
      resolvedPicks: 1,
    })
  })

  it("does not score unresolved series", () => {
    expect(scorePlayoffEntryPicks([{ id: "series-1", winnerTeamName: null }], [{ seriesId: "series-1", pickTeamName: "Celtics" }])).toEqual({
      totalScore: 0,
      correctPicks: 0,
      resolvedPicks: 0,
    })
  })
})
