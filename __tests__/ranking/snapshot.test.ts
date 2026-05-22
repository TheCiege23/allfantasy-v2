import { describe, expect, it } from "vitest"

import {
  composeRankingSnapshot,
  neutralRankingSnapshot,
  RankingSnapshotWeights,
} from "@/lib/ranking/snapshot"

describe("composeRankingSnapshot", () => {
  it("returns a finite snapshot for empty input", () => {
    const s = composeRankingSnapshot({
      userId: "u1",
      importedHistory: [],
      leagueDifficulties: [],
    })
    expect(s.userId).toBe("u1")
    expect(Number.isFinite(s.rating.overall)).toBe(true)
    expect(s.rating.sports.length).toBeGreaterThan(0)
    expect(s.sources).toEqual([])
  })

  it("rewards championships over no championships", () => {
    const none = composeRankingSnapshot({
      userId: "a",
      importedHistory: [
        {
          source: "sleeper_history",
          wins: 10,
          losses: 10,
          ties: 0,
          championships: 0,
          playoffAppearances: 0,
          seasons: 2,
        },
      ],
      leagueDifficulties: [],
    })
    const withTitles = composeRankingSnapshot({
      userId: "b",
      importedHistory: [
        {
          source: "sleeper_history",
          wins: 10,
          losses: 10,
          ties: 0,
          championships: 3,
          playoffAppearances: 3,
          seasons: 2,
        },
      ],
      leagueDifficulties: [],
    })
    expect(withTitles.rating.overall).toBeGreaterThan(none.rating.overall)
  })

  it("clamps overall within RATING_RANGE", () => {
    const s = composeRankingSnapshot({
      userId: "u",
      importedHistory: [
        {
          source: "sleeper_history",
          wins: 9999,
          losses: 0,
          ties: 0,
          championships: 9999,
          playoffAppearances: 9999,
          seasons: 9999,
        },
      ],
      leagueDifficulties: [],
    })
    expect(s.rating.overall).toBeLessThanOrEqual(RankingSnapshotWeights.RATING_RANGE.max)
    expect(s.rating.overall).toBeGreaterThanOrEqual(RankingSnapshotWeights.RATING_RANGE.min)
  })

  it("aggregates per-sport history when sportHistory is provided", () => {
    const s = composeRankingSnapshot({
      userId: "u",
      importedHistory: [],
      leagueDifficulties: [],
      sportHistory: [
        { sport: "NFL", wins: 10, losses: 3, ties: 0, championships: 1, playoffAppearances: 2, seasons: 1 },
        { sport: "NBA", wins: 5, losses: 8, ties: 0, championships: 0, playoffAppearances: 0, seasons: 1 },
      ],
    })
    expect(s.rating.sports.map((sp: { sport: string }) => sp.sport).sort()).toEqual(["NBA", "NFL"])
  })

  it("uniques imported history sources", () => {
    const s = composeRankingSnapshot({
      userId: "u",
      importedHistory: [
        {
          source: "sleeper_history",
          wins: 0,
          losses: 0,
          ties: 0,
          championships: 0,
          playoffAppearances: 0,
          seasons: 0,
        },
        {
          source: "sleeper_history",
          wins: 0,
          losses: 0,
          ties: 0,
          championships: 0,
          playoffAppearances: 0,
          seasons: 0,
        },
      ],
      leagueDifficulties: [],
    })
    expect(s.sources).toEqual(["sleeper_history"])
  })

  it("neutralRankingSnapshot returns a snapshot at BASE_RATING", () => {
    const s = neutralRankingSnapshot("u1")
    expect(s.rating.overall).toBe(RankingSnapshotWeights.BASE_RATING)
  })
})
