import { describe, it, expect } from "vitest"
import { assignRanks, type LeaderboardRowInput } from "../lib/brackets/leaderboard"

describe("leaderboard.assignRanks", () => {
  it("assigns ranks with ties correctly", () => {
    const rows: LeaderboardRowInput[] = [
      { tournamentId: "T1", leagueId: null, entryId: "e1", score: 100 },
      { tournamentId: "T1", leagueId: null, entryId: "e2", score: 90 },
      { tournamentId: "T1", leagueId: null, entryId: "e3", score: 100 },
      { tournamentId: "T1", leagueId: null, entryId: "e4", score: 80 },
    ]

    const ranked = assignRanks(rows)

    const byId = new Map(ranked.map((r) => [r.entryId, r]))
    expect(byId.get("e1")?.rank).toBe(1)
    expect(byId.get("e3")?.rank).toBe(1)
    expect(byId.get("e2")?.rank).toBe(3)
    expect(byId.get("e4")?.rank).toBe(4)
  })

  it("captures previousRank when provided", () => {
    const rows: LeaderboardRowInput[] = [
      { tournamentId: "T1", leagueId: "L1", entryId: "e1", score: 100 },
      { tournamentId: "T1", leagueId: "L1", entryId: "e2", score: 90 },
    ]
    const prev = new Map<string, number>()
    prev.set("T1:L1:e1", 2)
    prev.set("T1:L1:e2", 1)

    const ranked = assignRanks(rows, prev)
    const e1 = ranked.find((r) => r.entryId === "e1")!
    const e2 = ranked.find((r) => r.entryId === "e2")!

    expect(e1.previousRank).toBe(2)
    expect(e2.previousRank).toBe(1)
  })
})

