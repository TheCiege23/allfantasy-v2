/**
 * Phase 2C Batch 3 — opponentStrength scaffold tests.
 */

import { describe, expect, it } from "vitest"
import { computeOpponentStrength } from "@/lib/chimmy-context/intel/opponentStrength"

describe("computeOpponentStrength (scaffold)", () => {
  it("returns rating='unknown' with neutral factors when no formulas are wired", () => {
    const out = computeOpponentStrength({
      opponentTeamId: "team-A",
      opponentAiPowerScore: null,
      opponentProjectedWins: null,
      opponentRecentForm: null,
      leagueMeanAiPowerScore: null,
    })
    expect(out.rating).toBe("unknown")
    expect(out.score).toBeNull()
    expect(out.factors.afPowerScore).toBeNull()
    expect(out.factors.leagueRelativeStrength).toBeNull()
    expect(out.factors.projectedWinsDelta).toBeNull()
    expect(out.factors.recentForm).toBeNull()
    expect(out.notes).toEqual([])
  })

  it("echoes afPowerScore and computes leagueRelativeStrength when both provided", () => {
    const out = computeOpponentStrength({
      opponentTeamId: "team-A",
      opponentAiPowerScore: 87.5,
      opponentProjectedWins: 9,
      opponentRecentForm: "W-W-L",
      leagueMeanAiPowerScore: 80,
    })
    expect(out.factors.afPowerScore).toBe(87.5)
    expect(out.factors.leagueRelativeStrength).toBe(7.5)
    expect(out.factors.recentForm).toBe("W-W-L")
    expect(out.inputs.opponentProjectedWins).toBe(9)
    // Rating + score stay neutral until formulas land.
    expect(out.rating).toBe("unknown")
    expect(out.score).toBeNull()
  })

  it("never throws on extreme inputs", () => {
    expect(() =>
      computeOpponentStrength({
        opponentTeamId: null,
        opponentAiPowerScore: Number.NaN,
        opponentProjectedWins: Number.POSITIVE_INFINITY,
        opponentRecentForm: "",
        leagueMeanAiPowerScore: Number.NEGATIVE_INFINITY,
      })
    ).not.toThrow()
  })

  it("(Batch 4) echoes new optional factors when provided", () => {
    const out = computeOpponentStrength({
      opponentTeamId: "team-A",
      opponentAiPowerScore: 80,
      opponentProjectedWins: 8,
      opponentRecentForm: "W-W-L",
      leagueMeanAiPowerScore: 75,
      opponentCurrentRank: 3,
      opponentCurrentStreak: "W2",
      opponentScoringStdDev: 12.4,
      leagueDifficultyScore: 62,
      opponentHistoricalSuccessScore: 71,
    })
    expect(out.factors.currentRank).toBe(3)
    expect(out.factors.currentStreak).toBe("W2")
    expect(out.factors.scoringConsistencyStdDev).toBe(12.4)
    expect(out.factors.leagueDifficultyScore).toBe(62)
    expect(out.factors.historicalSuccessScore).toBe(71)
    // Rating still neutral.
    expect(out.rating).toBe("unknown")
    expect(out.score).toBeNull()
  })

  it("(Batch 4) defaults new factors to null when omitted", () => {
    const out = computeOpponentStrength({
      opponentTeamId: null,
      opponentAiPowerScore: null,
      opponentProjectedWins: null,
      opponentRecentForm: null,
      leagueMeanAiPowerScore: null,
    })
    expect(out.factors.currentRank).toBeNull()
    expect(out.factors.currentStreak).toBeNull()
    expect(out.factors.scoringConsistencyStdDev).toBeNull()
    expect(out.factors.leagueDifficultyScore).toBeNull()
    expect(out.factors.historicalSuccessScore).toBeNull()
  })
})
