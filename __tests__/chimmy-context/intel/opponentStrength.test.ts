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
})
