import { describe, expect, it } from "vitest"

import {
  computeLeagueDifficulty,
  neutralLeagueDifficulty,
  LeagueDifficultyWeights,
} from "@/lib/ranking/league-difficulty"

describe("computeLeagueDifficulty", () => {
  it("returns base * sport multiplier for a vanilla NFL redraft", () => {
    const r = computeLeagueDifficulty({ leagueId: "L1", sport: "NFL" })
    expect(r.leagueId).toBe("L1")
    expect(r.base).toBe(LeagueDifficultyWeights.BASE_DIFFICULTY * 1) // NFL sport mult = 1
    expect(r.effective).toBeGreaterThanOrEqual(LeagueDifficultyWeights.DIFFICULTY_SCORE_RANGE.min)
    expect(r.effective).toBeLessThanOrEqual(LeagueDifficultyWeights.DIFFICULTY_SCORE_RANGE.max)
  })

  it("raises difficulty for dynasty over redraft", () => {
    const redraft = computeLeagueDifficulty({ leagueId: "A", sport: "NFL" })
    const dyn = computeLeagueDifficulty({
      leagueId: "B",
      sport: "NFL",
      isDynasty: true,
    })
    expect(dyn.effective).toBeGreaterThan(redraft.effective)
  })

  it("raises difficulty for elimination formats (guillotine/survivor)", () => {
    const base = computeLeagueDifficulty({ leagueId: "A", sport: "NFL" })
    const gut = computeLeagueDifficulty({
      leagueId: "B",
      sport: "NFL",
      guillotine: true,
    })
    expect(gut.effective).toBeGreaterThan(base.effective)
  })

  it("raises difficulty for superflex / TE-premium / IDP scoring", () => {
    const standard = computeLeagueDifficulty({ leagueId: "A", scoring: "half_ppr" })
    const heavy = computeLeagueDifficulty({
      leagueId: "B",
      scoring: "half_ppr_superflex_te-premium_idp",
    })
    expect(heavy.effective).toBeGreaterThan(standard.effective)
  })

  it("clamps modifiers within MODIFIER_CLAMPS", () => {
    const r = computeLeagueDifficulty({
      leagueId: "X",
      sport: "NFL",
      isDynasty: true,
      guillotine: true,
      survivor: true,
      scoring: "superflex_te-premium_idp_custom_ppr",
      customScoring: true,
      starterCount: 50,
      taxiSlots: 50,
      irSlots: 50,
      rookiePickRounds: 50,
      devySlots: 50,
      teamCount: 16,
    })
    const c = LeagueDifficultyWeights.MODIFIER_CLAMPS
    expect(r.modifiers.leagueTypeMultiplier).toBeLessThanOrEqual(c.leagueType.max)
    expect(r.modifiers.scoringComplexityModifier).toBeLessThanOrEqual(c.scoringComplexity.max)
    expect(r.effective).toBeLessThanOrEqual(LeagueDifficultyWeights.DIFFICULTY_SCORE_RANGE.max)
  })

  it("never returns NaN for empty input", () => {
    const r = computeLeagueDifficulty({ leagueId: "empty" })
    expect(Number.isFinite(r.base)).toBe(true)
    expect(Number.isFinite(r.effective)).toBe(true)
    for (const v of Object.values(r.modifiers)) {
      expect(Number.isFinite(v)).toBe(true)
    }
  })

  it("neutralLeagueDifficulty returns a neutral, finite rating", () => {
    const n = neutralLeagueDifficulty("L1")
    expect(n.leagueId).toBe("L1")
    expect(Number.isFinite(n.effective)).toBe(true)
    expect(n.modifiers.leagueTypeMultiplier).toBe(1)
  })
})
