import { describe, expect, it } from "vitest"
import { getPlayoffPickResult, scorePlayoffEntryPicks } from "@/lib/playoffs/playoffScoring"

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

  it("returns correct pick result with one point", () => {
    expect(getPlayoffPickResult(
      { winnerTeamName: "Knicks", seriesSummary: "Knicks win series 4-0" },
      { pickTeamName: "Knicks" },
    )).toMatchObject({
      status: "correct",
      points: 1,
      pickTeamName: "Knicks",
      winnerTeamName: "Knicks",
      seriesSummary: "Knicks win series 4-0",
    })
  })

  it("returns wrong pick result with zero points", () => {
    expect(getPlayoffPickResult(
      { winnerTeamName: "Nuggets", seriesSummary: "Nuggets win series 4-2" },
      { pickTeamName: "Lakers" },
    )).toMatchObject({
      status: "wrong",
      points: 0,
    })
  })

  it("returns pending result when no official winner exists", () => {
    expect(getPlayoffPickResult(
      { winnerTeamName: null, seriesSummary: "Series tied 2-2" },
      { pickTeamName: "Celtics" },
    )).toMatchObject({
      status: "pending",
      points: 0,
      pickTeamName: "Celtics",
    })
  })

  it("returns no_pick result when entry has not picked the series", () => {
    expect(getPlayoffPickResult(
      { winnerTeamName: "Knicks", seriesSummary: "Knicks win series 4-0" },
      null,
    )).toMatchObject({
      status: "no_pick",
      points: 0,
      pickTeamName: null,
    })
  })
})
