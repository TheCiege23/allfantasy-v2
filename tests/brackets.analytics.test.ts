import { describe, it, expect, vi, beforeAll, afterAll } from "vitest"
import {
  normalizeTeamAnalytics,
  buildMatchupAnalytics,
  simulateSingleTournament,
  simulateEntryRankDistribution,
  BracketNodeLite,
  NodeProbabilityMap,
} from "@/lib/brackets/analytics"

// Deterministic Math.random for simulation tests
const originalRandom = Math.random

describe("brackets analytics", () => {
  beforeAll(() => {
    vi.spyOn(Math, "random").mockImplementation(() => 0.3)
  })

  afterAll(() => {
    ;(Math.random as any) = originalRandom
  })

  it("normalizes team analytics and computes netRating", () => {
    const team = normalizeTeamAnalytics({
      tournamentId: "t1",
      seasonYear: 2025,
      teamId: "A",
      teamName: "Team A",
      seed: 1,
      region: "East",
      offensiveRating: 120,
      defensiveRating: 100,
      recentForm: 5,
    })

    expect(team.netRating).toBe(20)
    expect(team.injuryFlags).toEqual([])
    expect(team.sourceTimestamp).toBeTruthy()
  })

  it("builds matchup analytics with probabilities summing to 1 and a confidence label", () => {
    const team1 = normalizeTeamAnalytics({
      tournamentId: "t1",
      seasonYear: 2025,
      teamId: "A",
      teamName: "Team A",
      seed: 1,
      offensiveRating: 120,
      defensiveRating: 100,
      recentForm: 5,
      strengthOfSchedule: 10,
    })
    const team2 = normalizeTeamAnalytics({
      tournamentId: "t1",
      seasonYear: 2025,
      teamId: "B",
      teamName: "Team B",
      seed: 16,
      offensiveRating: 105,
      defensiveRating: 102,
      recentForm: 2,
      strengthOfSchedule: 5,
    })

    const matchup = buildMatchupAnalytics({
      tournamentId: "t1",
      gameId: "g1",
      round: 1,
      team1,
      team2,
    })

    const sum = matchup.probabilityTeam1 + matchup.probabilityTeam2
    expect(sum).toBeGreaterThan(0.99)
    expect(sum).toBeLessThan(1.01)
    expect(matchup.favoriteTeamId).toBe("A")
    expect(["low", "medium", "high"]).toContain(matchup.confidenceLabel)
    expect(matchup.keyFactors.length).toBeGreaterThan(0)
  })

  it("simulates a single tournament and advances winners correctly", () => {
    const nodes: BracketNodeLite[] = [
      {
        id: "g1",
        round: 1,
        homeTeamName: "Team A",
        awayTeamName: "Team B",
        nextNodeId: "g2",
        nextNodeSide: "home",
      },
      {
        id: "g2",
        round: 2,
        homeTeamName: null,
        awayTeamName: "Team C",
        nextNodeId: null,
        nextNodeSide: null,
      },
    ]

    const probabilities: NodeProbabilityMap = {
      g1: { pHome: 0.8, pAway: 0.2 },
      g2: { pHome: 0.5, pAway: 0.5 },
    }

    const { winnersByNode } = simulateSingleTournament({ nodes, probabilities })

    // With Math.random mocked to 0.3, Team A (home) should win g1
    expect(winnersByNode.g1).toBe("Team A")
    // Team A should be advanced into g2 home slot
    expect(nodes.find((n) => n.id === "g2")?.homeTeamName).toBe("Team A")
  })

  it("computes rank distribution summary for a simple league", () => {
    const nodes: BracketNodeLite[] = [
      {
        id: "champ",
        round: 6,
        homeTeamName: "Team A",
        awayTeamName: "Team B",
        nextNodeId: null,
        nextNodeSide: null,
      },
    ]

    const probabilities: NodeProbabilityMap = {
      champ: { pHome: 0.7, pAway: 0.3 },
    }

    const entryIds = ["e1", "e2"]

    // Simple scoring: +1 if you picked the simulated champion correctly
    const scoreEntry = (entryId: string, winnersByNode: Record<string, string | null>) => {
      const champ = winnersByNode["champ"]
      if (!champ) return 0
      // e1 always picks Team A, e2 always picks Team B
      if (entryId === "e1" && champ === "Team A") return 1
      if (entryId === "e2" && champ === "Team B") return 1
      return 0
    }

    const summary = simulateEntryRankDistribution({
      simulations: 10,
      nodes,
      probabilities,
      entryIds,
      scoreEntry,
      targetEntryId: "e1",
      tournamentId: "t1",
    })

    expect(summary.tournamentId).toBe("t1")
    expect(summary.entryId).toBe("e1")
    expect(summary.simulations).toBe(10)
    expect(summary.winLeagueProbability).toBeGreaterThanOrEqual(0)
    expect(summary.top5Probability).toBeGreaterThanOrEqual(0)
    expect(summary.expectedRank).toBeGreaterThan(0)
    // Frequencies should be normalized to probabilities
    const champFreqSum = Object.values(summary.championshipFrequency).reduce(
      (acc, v) => acc + v,
      0
    )
    expect(champFreqSum).toBeGreaterThan(0.9)
    expect(champFreqSum).toBeLessThan(1.1)
  })
})

