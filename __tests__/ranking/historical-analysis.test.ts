import { describe, expect, it } from "vitest"

import {
  analyzeChampionships,
  analyzeConsistency,
  analyzeDynasty,
  analyzeLongevity,
  analyzePlayoffs,
  analyzeScoringComplexity,
  analyzeSleeperHistory,
} from "@/lib/ranking/historical-analysis"
import type { LegacyLeagueHistoryRow } from "@/lib/ranking/computeLegacyRank"

function row(overrides: Partial<LegacyLeagueHistoryRow> = {}): LegacyLeagueHistoryRow {
  return {
    season: 2024,
    sport: "nfl",
    type: "redraft",
    scoring: "half_ppr",
    team_count: 12,
    wins: 8,
    losses: 6,
    ties: 0,
    made_playoffs: true,
    is_champion: false,
    ...overrides,
  }
}

describe("analyzeChampionships", () => {
  it("counts and biases recent titles higher", () => {
    const old = analyzeChampionships(
      [row({ season: 2010, is_champion: true })],
      2024
    )
    const recent = analyzeChampionships(
      [row({ season: 2024, is_champion: true })],
      2024
    )
    expect(old.count).toBe(1)
    expect(recent.count).toBe(1)
    expect(recent.recencyWeighted).toBeGreaterThan(old.recencyWeighted)
  })

  it("groups by format", () => {
    const r = analyzeChampionships(
      [
        row({ is_champion: true, type: "redraft" }),
        row({ is_champion: true, type: "dynasty" }),
        row({ is_champion: true, type: "dynasty" }),
      ],
      2024
    )
    expect(r.count).toBe(3)
    expect(r.byFormat.dynasty).toBe(2)
    expect(r.byFormat.redraft).toBe(1)
  })
})

describe("analyzePlayoffs", () => {
  it("returns null rate for empty input", () => {
    expect(analyzePlayoffs([]).rate).toBeNull()
  })

  it("computes longest consecutive playoff streak by season", () => {
    const rows = [
      row({ season: 2020, made_playoffs: true }),
      row({ season: 2021, made_playoffs: true }),
      row({ season: 2022, made_playoffs: false }),
      row({ season: 2023, made_playoffs: true }),
      row({ season: 2024, made_playoffs: true }),
    ]
    expect(analyzePlayoffs(rows).streak).toBe(2)
  })
})

describe("analyzeLongevity", () => {
  it("counts unique seasons / formats / sports", () => {
    const r = analyzeLongevity([
      row({ season: 2022, sport: "nfl", type: "redraft" }),
      row({ season: 2023, sport: "nfl", type: "dynasty" }),
      row({ season: 2023, sport: "nba", type: "dynasty" }),
    ])
    expect(r.seasons).toBe(2)
    expect(r.formats).toBe(2)
    expect(r.sports).toBe(2)
  })
})

describe("analyzeDynasty", () => {
  it("returns zero buckets when no dynasty leagues exist", () => {
    const r = analyzeDynasty([row({ type: "redraft" })])
    expect(r.dynastyLeagues).toBe(0)
    expect(r.avgFinalStanding).toBeNull()
  })

  it("counts dynasty championships", () => {
    const r = analyzeDynasty([
      row({ type: "dynasty", is_champion: true }),
      row({ type: "dynasty", is_champion: false }),
    ])
    expect(r.dynastyLeagues).toBe(2)
    expect(r.championshipsInDynasty).toBe(1)
  })
})

describe("analyzeConsistency", () => {
  it("returns null stdev for <2 leagues", () => {
    expect(analyzeConsistency([]).winPctStdev).toBeNull()
    expect(analyzeConsistency([row()]).winPctStdev).toBeNull()
  })

  it("returns a finite stdev for >=2 leagues", () => {
    const r = analyzeConsistency([row({ wins: 12, losses: 2 }), row({ wins: 2, losses: 12 })])
    expect(r.winPctStdev).not.toBeNull()
    expect(Number.isFinite(r.winPctStdev as number)).toBe(true)
  })
})

describe("analyzeScoringComplexity", () => {
  it("returns 0 for empty input", () => {
    expect(analyzeScoringComplexity([]).avgComplexityScore).toBe(0)
  })

  it("scores superflex+IDP higher than vanilla PPR", () => {
    const plain = analyzeScoringComplexity([row({ scoring: "ppr" })])
    const heavy = analyzeScoringComplexity([row({ scoring: "ppr_superflex_idp" })])
    expect(heavy.avgComplexityScore).toBeGreaterThan(plain.avgComplexityScore)
  })
})

describe("analyzeSleeperHistory", () => {
  it("returns a fully populated report with a deterministic headline", () => {
    const report = analyzeSleeperHistory({
      rows: [
        row({ season: 2023, is_champion: true }),
        row({ season: 2024, made_playoffs: false }),
      ],
      currentYear: 2024,
      avgLeagueDifficulty: 5200,
    })
    expect(report.championships.count).toBe(1)
    expect(report.longevity.seasons).toBe(2)
    expect(report.leagueDifficulty.average).toBe(5200)
    expect(typeof report.headline).toBe("string")
    expect(report.headline.length).toBeGreaterThan(0)
  })

  it("survives empty input without throwing", () => {
    const report = analyzeSleeperHistory({ rows: [] })
    expect(report.championships.count).toBe(0)
    expect(report.longevity.seasons).toBe(0)
    expect(report.headline.length).toBeGreaterThan(0)
  })
})
