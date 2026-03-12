import { describe, it, expect, vi } from "vitest"
import { computeTournamentChaos } from "../lib/brackets/chaos"

// This is a thin test that mocks prisma to simulate a small bracket,
// focusing on chaos score math rather than real DB access.

vi.mock("../lib/prisma", () => {
  return {
    prisma: {
      bracketNode: {
        findMany: vi.fn(async ({ where }: any) => {
          if (where.tournamentId === "T_EMPTY") return []
          return [
            {
              id: "n1",
              round: 1,
              seedHome: 1,
              seedAway: 16,
              homeTeamName: "A1",
              awayTeamName: "B16",
              sportsGameId: "g1",
            },
            {
              id: "n2",
              round: 1,
              seedHome: 5,
              seedAway: 12,
              homeTeamName: "A5",
              awayTeamName: "B12",
              sportsGameId: "g2",
            },
          ]
        }),
      },
      sportsGame: {
        findMany: vi.fn(async ({ where }: any) => {
          if (where.id.in?.includes("g1")) {
            return [
              {
                id: "g1",
                homeScore: 60,
                awayScore: 68,
                status: "final",
              },
              {
                id: "g2",
                homeScore: 70,
                awayScore: 65,
                status: "final",
              },
            ]
          }
          return []
        }),
      },
      bracketPick: {
        findMany: vi.fn(async () => {
          // Simulate moderate accuracy: 60% correct
          const total = 10
          const correct = 6
          const res: any[] = []
          for (let i = 0; i < total; i++) {
            res.push({ isCorrect: i < correct })
          }
          return res
        }),
      },
    },
  }
})

describe("computeTournamentChaos", () => {
  it("returns predictable metrics for empty tournaments", async () => {
    const res = await computeTournamentChaos("T_EMPTY")
    expect(res.chaosScore).toBe(0)
    expect(res.label).toBe("predictable")
  })

  it("detects upsets and produces non-zero chaos", async () => {
    const res = await computeTournamentChaos("T1")
    expect(res.totalGamesFinal).toBeGreaterThan(0)
    expect(res.upsetCount).toBeGreaterThanOrEqual(1)
    expect(res.chaosScore).toBeGreaterThan(0)
  })
})

