import { describe, expect, it } from "vitest"
import { getPlayoffCompletionSummary } from "@/lib/playoffs/playoffCompletion"
import type { PlayoffPickView, PlayoffSeriesView } from "@/lib/playoffs/types"

const availableSeries: PlayoffSeriesView = {
  id: "s1",
  round: "round_1",
  roundIndex: 1,
  seriesNumber: 1,
  conference: "east",
  homeSeed: 1,
  awaySeed: 8,
  homeTeamName: "Knicks",
  awayTeamName: "Hawks",
  winnerTeamName: null,
  bestOf: 7,
  status: "in_progress",
  startsAt: "2026-05-01T00:00:00.000Z",
  nextSeriesNumber: 9,
  nextSeriesSlot: "home",
  sourceSeriesHome: null,
  sourceSeriesAway: null,
}

const tbdSeries: PlayoffSeriesView = {
  ...availableSeries,
  id: "s9",
  round: "conference_semifinals",
  roundIndex: 2,
  seriesNumber: 9,
  homeSeed: 0,
  awaySeed: 0,
  homeTeamName: "Winner S1",
  awayTeamName: "Winner S2",
  sourceSeriesHome: 1,
  sourceSeriesAway: 2,
}

const pick: PlayoffPickView = {
  id: "p1",
  entryId: "entry-1",
  seriesId: "s1",
  pickTeamName: "Knicks",
  createdAt: "",
  updatedAt: "",
}

describe("playoff completion modes", () => {
  it("requires every series for strict/default pools", () => {
    const summary = getPlayoffCompletionSummary([availableSeries, tbdSeries], [pick], {
      lockRule: "series_start",
      isPoolOwner: true,
    })

    expect(summary.mode).toBe("full_bracket_required")
    expect(summary.requiredPickCount).toBe(2)
    expect(summary.isSubmittable).toBe(false)
  })

  it("requires only currently available series for no-lock test verification", () => {
    const summary = getPlayoffCompletionSummary([availableSeries, tbdSeries], [pick], {
      lockRule: "none",
      hasPoolAdminAccess: true,
    })

    expect(summary.mode).toBe("available_picks_only")
    expect(summary.requiredSeriesIds).toEqual(["s1"])
    expect(summary.unavailableSeriesCount).toBe(1)
    expect(summary.isSubmittable).toBe(true)
  })

  it("blocks partial submit when an available series is missing", () => {
    const summary = getPlayoffCompletionSummary([availableSeries, tbdSeries], [], {
      lockRule: "none",
      hasPoolAdminAccess: true,
    })

    expect(summary.mode).toBe("available_picks_only")
    expect(summary.missingRequiredSeriesIds).toEqual(["s1"])
    expect(summary.isSubmittable).toBe(false)
  })
})
