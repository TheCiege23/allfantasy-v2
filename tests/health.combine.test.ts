import { describe, it, expect } from "vitest"
import { combineHealthComponents, type HealthMetrics } from "../lib/brackets/intelligence/data-engine"

const baseHealth: HealthMetrics = {
  alivePct: 1,
  teamsAlive: 10,
  teamsTotal: 10,
  maxPossiblePoints: 320,
  currentPoints: 100,
  currentRank: 1,
  totalEntries: 100,
  upside: 0,
  riskExposure: 0,
  championAlive: true,
  finalFourAlive: 4,
  finalFourTotal: 4,
}

describe("combineHealthComponents", () => {
  it("gives high score for a perfect, alive bracket", () => {
    const result = combineHealthComponents({
      health: baseHealth,
      remainingPoints: 220,
      championAlive: true,
      finalFourAliveRatio: 1,
      uniquenessScore: 80,
      winLeagueProbability: 0.5,
    })
    expect(result.score).toBeGreaterThan(75)
    expect(result.statusLabel).toBe("strong")
  })

  it("penalizes eliminated champion", () => {
    const result = combineHealthComponents({
      health: { ...baseHealth, championAlive: false },
      remainingPoints: 180,
      championAlive: false,
      finalFourAliveRatio: 0.5,
      uniquenessScore: 60,
      winLeagueProbability: 0.1,
    })
    expect(result.score).toBeLessThan(70)
  })

  it("penalizes low alivePct and high riskExposure", () => {
    const sick: HealthMetrics = {
      ...baseHealth,
      alivePct: 0.2,
      teamsAlive: 2,
      teamsTotal: 10,
      riskExposure: 0.8,
      currentRank: 80,
    }
    const result = combineHealthComponents({
      health: sick,
      remainingPoints: 50,
      championAlive: false,
      finalFourAliveRatio: 0.25,
      uniquenessScore: 30,
      winLeagueProbability: 0.02,
    })
    expect(result.score).toBeLessThan(40)
  })

  it("rewards high uniqueness when other factors are moderate", () => {
    const mid: HealthMetrics = {
      ...baseHealth,
      alivePct: 0.6,
      currentRank: 40,
      riskExposure: 0.4,
    }
    const lowUniq = combineHealthComponents({
      health: mid,
      remainingPoints: 150,
      championAlive: true,
      finalFourAliveRatio: 0.75,
      uniquenessScore: 20,
      winLeagueProbability: 0.1,
    })
    const highUniq = combineHealthComponents({
      health: mid,
      remainingPoints: 150,
      championAlive: true,
      finalFourAliveRatio: 0.75,
      uniquenessScore: 90,
      winLeagueProbability: 0.1,
    })
    expect(highUniq.score).toBeGreaterThan(lowUniq.score)
  })
})

