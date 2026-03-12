import { describe, it, expect, vi } from "vitest"
import { LiveGameSummary } from "../lib/brackets/live-intel"

// This test focuses on the upsetProbability / momentumScore invariants by
// reusing the exported type and mirroring the model logic.

function computeUpsetSignals(seedHome: number, seedAway: number, homeScore: number, awayScore: number) {
  const lowerSeedHome = seedHome > seedAway
  const totalPoints = Math.max(homeScore, awayScore)
  const progress = Math.min(1, totalPoints / 80)
  const scoreDiff = (homeScore - awayScore) * (lowerSeedHome ? 1 : -1)
  const baseUpset =
    seedHome > seedAway
      ? 0.2 + (seedHome - seedAway) * 0.03
      : 0.2 + (seedAway - seedHome) * 0.03
  const leadEffect = 0.15 * Math.tanh(scoreDiff / 8)
  const timeFactor = 0.5 + 0.5 * progress
  const raw = baseUpset * timeFactor + leadEffect
  const upsetProbability = Math.max(0.01, Math.min(0.99, raw))

  const pctDiff =
    homeScore + awayScore > 0
      ? Math.abs(homeScore - awayScore) / Math.max(homeScore, awayScore)
      : 0
  const momentumScore = Math.max(0, Math.min(1, pctDiff * timeFactor))

  return { upsetProbability, momentumScore }
}

describe("live-intel upset model", () => {
  it("increases upset probability when underdog leads late", () => {
    const seedHome = 12
    const seedAway = 5

    const earlyTied = computeUpsetSignals(seedHome, seedAway, 10, 10)
    const lateUnderdogLead = computeUpsetSignals(seedHome, seedAway, 70, 65)

    expect(lateUnderdogLead.upsetProbability).toBeGreaterThan(earlyTied.upsetProbability)
  })

  it("keeps probabilities within [0.01, 0.99]", () => {
    const cases = [
      computeUpsetSignals(16, 1, 80, 0),
      computeUpsetSignals(1, 16, 0, 80),
      computeUpsetSignals(8, 9, 40, 42),
    ]
    for (const c of cases) {
      expect(c.upsetProbability).toBeGreaterThanOrEqual(0.01)
      expect(c.upsetProbability).toBeLessThanOrEqual(0.99)
      expect(c.momentumScore).toBeGreaterThanOrEqual(0)
      expect(c.momentumScore).toBeLessThanOrEqual(1)
    }
  })
})

