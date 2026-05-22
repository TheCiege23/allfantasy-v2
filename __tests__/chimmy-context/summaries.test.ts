import { describe, expect, it } from "vitest"

import {
  summarizeHistoricalAnalysis,
  summarizeImportedLegacy,
  summarizeLeagueDifficulty,
  summarizeMatchup,
  summarizeRanking,
  summarizeRoster,
  summarizeStandings,
} from "@/lib/chimmy-context/summaries"
import { analyzeSleeperHistory } from "@/lib/ranking/historical-analysis"
import {
  composeRankingSnapshot,
  neutralRankingSnapshot,
} from "@/lib/ranking/snapshot"
import {
  computeLeagueDifficulty,
  neutralLeagueDifficulty,
} from "@/lib/ranking/league-difficulty"

describe("intelligence summaries", () => {
  it("return empty string for null slices", () => {
    expect(summarizeMatchup(null)).toBe("")
    expect(summarizeRoster(null)).toBe("")
    expect(summarizeStandings(null)).toBe("")
    expect(summarizeImportedLegacy(null)).toBe("")
    expect(summarizeHistoricalAnalysis(null)).toBe("")
    expect(summarizeLeagueDifficulty(null)).toBe("")
    expect(summarizeRanking(null)).toBe("")
  })

  it("summarizeMatchup includes projection margin", () => {
    const s = summarizeMatchup({
      leagueId: "L",
      week: 5,
      yourTeamId: "T1",
      opponentTeamId: "T2",
      yourProjectedPoints: 120.4,
      opponentProjectedPoints: 110.2,
      status: "scheduled",
    })
    expect(s).toContain("Week")
    expect(s).toContain("Projected margin")
  })

  it("summarizeRoster counts starter / bench positions", () => {
    const s = summarizeRoster({
      leagueId: "L",
      teamId: "T1",
      starters: [
        { playerId: "1", name: "QB1", position: "QB", team: null, slot: null },
        { playerId: "2", name: "WR1", position: "WR", team: null, slot: null },
      ],
      bench: [{ playerId: "3", name: "RB1", position: "RB", team: null, slot: null }],
    })
    expect(s).toContain("Starter count: 2")
    expect(s).toContain("Bench count: 1")
  })

  it("summarizeStandings limits to top 5", () => {
    const rows = Array.from({ length: 12 }).map((_, i) => ({
      teamId: `T${i}`,
      teamName: `Team ${i}`,
      rank: i + 1,
      wins: 5,
      losses: 5,
      ties: 0,
      pointsFor: null,
      pointsAgainst: null,
    }))
    const s = summarizeStandings({ leagueId: "L", rows })
    expect(s.split("\n").length).toBeLessThanOrEqual(6) // header + 5 entries
  })

  it("summarizeLeagueDifficulty renders effective + modifiers", () => {
    const rating = computeLeagueDifficulty({ leagueId: "L", sport: "NFL" })
    const s = summarizeLeagueDifficulty({
      rating: {
        leagueId: rating.leagueId,
        base: rating.base,
        modifiers: rating.modifiers,
        effective: rating.effective,
      },
    })
    expect(s).toContain("Effective")
  })

  it("summarizeLeagueDifficulty with neutral rating is non-empty", () => {
    expect(summarizeLeagueDifficulty({ rating: neutralLeagueDifficulty("L") })).toContain(
      "Effective"
    )
  })

  it("summarizeRanking includes overall + per-sport line", () => {
    const snapshot = composeRankingSnapshot({
      userId: "u",
      importedHistory: [],
      leagueDifficulties: [],
    })
    expect(summarizeRanking({ snapshot })).toContain("Overall")
  })

  it("summarizeRanking handles neutral snapshot", () => {
    expect(summarizeRanking({ snapshot: neutralRankingSnapshot("u") })).toContain(
      "Overall"
    )
  })

  it("summarizeHistoricalAnalysis renders headline and dimensions", () => {
    const report = analyzeSleeperHistory({
      rows: [
        {
          season: 2024,
          sport: "nfl",
          type: "redraft",
          scoring: "ppr",
          team_count: 12,
          wins: 10,
          losses: 4,
          ties: 0,
          made_playoffs: true,
          is_champion: true,
        },
      ],
      avgLeagueDifficulty: 5100,
      currentYear: 2024,
    })
    const s = summarizeHistoricalAnalysis(report)
    expect(s).toContain("Headline")
    expect(s).toContain("Championships")
  })

  it("summarizeImportedLegacy with totalLeagues=0 returns empty", () => {
    const s = summarizeImportedLegacy({
      source: "sleeper",
      totalLeagues: 0,
      totalSeasons: 0,
      careerRecord: null,
      winPercentage: null,
      championships: 0,
      archetype: null,
      recentLeagues: [],
    })
    expect(s).toBe("")
  })
})
