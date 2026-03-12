import { describe, it, expect } from "vitest"
import {
  type BracketNodeLite,
  type NodeProbabilityMap,
  simulateSingleTournament,
  simulateEntryRankDistribution,
} from "../lib/brackets/analytics"

describe("Monte Carlo tournament simulation engine", () => {
  const simpleNodes: BracketNodeLite[] = [
    // Round 1
    {
      id: "r1-g1",
      round: 1,
      homeTeamName: "A",
      awayTeamName: "B",
      nextNodeId: "r2-g1",
      nextNodeSide: "home",
    },
    {
      id: "r1-g2",
      round: 1,
      homeTeamName: "C",
      awayTeamName: "D",
      nextNodeId: "r2-g1",
      nextNodeSide: "away",
    },
    // Final
    {
      id: "r2-g1",
      round: 2,
      homeTeamName: null,
      awayTeamName: null,
      nextNodeId: null,
      nextNodeSide: null,
    },
  ]

  const simpleProbs: NodeProbabilityMap = {
    "r1-g1": { pHome: 0.7, pAway: 0.3 },
    "r1-g2": { pHome: 0.6, pAway: 0.4 },
    "r2-g1": { pHome: 0.5, pAway: 0.5 },
  }

  it("produces deterministic winners when seeded RNG is used", () => {
    const seed = 1234
    const run1 = simulateSingleTournament({
      nodes: simpleNodes.map((n) => ({ ...n })),
      probabilities: simpleProbs,
      rng: (() => {
        // simple seeded wrapper around simulateEntryRankDistribution's RNG factory
        let s = seed
        return () => {
          s = (s * 1664525 + 1013904223) >>> 0
          return s / 4294967296
        }
      })(),
    })
    const run2 = simulateSingleTournament({
      nodes: simpleNodes.map((n) => ({ ...n })),
      probabilities: simpleProbs,
      rng: (() => {
        let s = seed
        return () => {
          s = (s * 1664525 + 1013904223) >>> 0
          return s / 4294967296
        }
      })(),
    })

    expect(run1.winnersByNode).toEqual(run2.winnersByNode)
  })

  it("produces deterministic rank distributions when seed is fixed", () => {
    const entryIds = ["e1", "e2", "e3"]

    const scoreEntry = (id: string, winnersByNode: Record<string, string | null>): number => {
      // e1 is perfectly aligned with winners; e2 is half; e3 is low
      const winnerFinal = winnersByNode["r2-g1"]
      if (!winnerFinal) return 0
      if (id === "e1") return 100
      if (id === "e2") return 60
      return 20
    }

    const seed = 999
    const summary1 = simulateEntryRankDistribution({
      simulations: 500,
      nodes: simpleNodes.map((n) => ({ ...n })),
      probabilities: simpleProbs,
      entryIds,
      scoreEntry,
      targetEntryId: "e1",
      tournamentId: "T1",
      seed,
    })
    const summary2 = simulateEntryRankDistribution({
      simulations: 500,
      nodes: simpleNodes.map((n) => ({ ...n })),
      probabilities: simpleProbs,
      entryIds,
      scoreEntry,
      targetEntryId: "e1",
      tournamentId: "T1",
      seed,
    })

    expect(summary1.winLeagueProbability).toBe(summary2.winLeagueProbability)
    expect(summary1.top5Probability).toBe(summary2.top5Probability)
    expect(summary1.expectedRank).toBe(summary2.expectedRank)
  })
})

