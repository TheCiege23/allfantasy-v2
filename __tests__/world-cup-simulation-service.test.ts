import { beforeEach, describe, expect, it, vi } from "vitest"

const state = vi.hoisted(() => ({
  challenge: null as any,
  matches: [] as any[],
  picks: [{ id: "pick-1", entryId: "entry-1", matchId: "m1", selectedTeamId: "t1" }],
}))

const recalculateMock = vi.hoisted(() => vi.fn(async () => []))

vi.mock("@/lib/world-cup/worldCupScoringService", () => ({
  recalculateWorldCupChallenge: recalculateMock,
}))

vi.mock("@/lib/prisma", () => {
  const updateMatch = async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
    const match = state.matches.find((row) => row.id === where.id)
    if (!match) throw new Error("match not found")
    Object.assign(match, data)
    return { ...match }
  }

  const updateChallenge = async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
    if (!state.challenge || state.challenge.id !== where.id) {
      throw new Error("challenge not found")
    }
    Object.assign(state.challenge, data)
    return { ...state.challenge }
  }

  const tx = {
    worldCupBracketMatch: { update: updateMatch },
    worldCupBracketChallenge: { update: updateChallenge },
  }

  return {
    prisma: {
      worldCupBracketChallenge: {
        findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
          if (!state.challenge || state.challenge.id !== where.id) return null
          return {
            ...state.challenge,
            matches: state.matches.map((row) => ({ ...row })),
          }
        }),
        update: vi.fn(updateChallenge),
      },
      worldCupBracketMatch: {
        update: vi.fn(updateMatch),
        findFirst: vi.fn(async ({ where }: { where: { challengeId: string; round: string } }) => {
          return state.matches.find(
            (row) => row.challengeId === where.challengeId && row.round === where.round
          ) ?? null
        }),
      },
      $transaction: vi.fn(async (callback: (db: typeof tx) => Promise<unknown>) => callback(tx)),
    },
  }
})

import {
  resetWorldCupSimulation,
  simulateWorldCupMatchResult,
  simulateWorldCupRound,
  simulateWorldCupTournament,
} from "@/lib/world-cup/worldCupSimulationService"

function baseChallenge() {
  return {
    id: "c1",
    ownerUserId: "owner-1",
    visibility: "private",
    includeThirdPlace: false,
    sourcePayload: {},
  }
}

function makeMatch(input: Partial<any> & { id: string; matchNumber: number; round: string }) {
  return {
    id: input.id,
    challengeId: "c1",
    round: input.round,
    matchNumber: input.matchNumber,
    homeSlotKey: input.homeSlotKey ?? `H-${input.matchNumber}`,
    awaySlotKey: input.awaySlotKey ?? `A-${input.matchNumber}`,
    homeTeamId: input.homeTeamId ?? null,
    awayTeamId: input.awayTeamId ?? null,
    homeTeamName: input.homeTeamName ?? "TBD",
    awayTeamName: input.awayTeamName ?? "TBD",
    homeTeamLogo: null,
    awayTeamLogo: null,
    homeScore: null,
    awayScore: null,
    status: "scheduled",
    winnerTeamId: null,
    winnerTeamName: null,
    nextMatchId: input.nextMatchId ?? null,
    nextMatchSlot: input.nextMatchSlot ?? null,
  }
}

describe("world cup simulation service", () => {
  beforeEach(() => {
    recalculateMock.mockClear()
    state.challenge = baseChallenge()
    state.picks = [{ id: "pick-1", entryId: "entry-1", matchId: "m1", selectedTeamId: "t1" }]
    state.matches = [
      makeMatch({
        id: "m1",
        matchNumber: 1,
        round: "round_of_32",
        homeTeamId: "t1",
        awayTeamId: "t2",
        homeTeamName: "Alpha",
        awayTeamName: "Bravo",
        nextMatchId: "m2",
        nextMatchSlot: "home",
      }),
      makeMatch({
        id: "m2",
        matchNumber: 2,
        round: "final",
        homeTeamId: "t3",
        awayTeamId: "t4",
        homeTeamName: "Charlie",
        awayTeamName: "Delta",
      }),
    ]
  })

  it("simulates a single final result with winner and score", async () => {
    const result = await simulateWorldCupMatchResult({
      challengeId: "c1",
      matchId: "m1",
      homeScore: 2,
      awayScore: 1,
      status: "final",
    })

    expect(result.updatedMatch.status).toBe("final")
    expect(result.updatedMatch.winnerTeamId).toBe("t1")
    expect(state.matches.find((m) => m.id === "m1")?.apiStatusShort).toBe("SIM")
  })

  it("advances winner to the next match slot", async () => {
    await simulateWorldCupMatchResult({
      challengeId: "c1",
      matchId: "m1",
      winnerTeamId: "t1",
      status: "final",
    })

    const next = state.matches.find((m) => m.id === "m2")
    expect(next?.homeTeamId).toBe("t1")
    expect(next?.apiStatusShort).toBe("SIM")
  })

  it("simulates an entire round and marks completion", async () => {
    const result = await simulateWorldCupRound({
      challengeId: "c1",
      round: "round_of_32",
      strategy: "home",
    })

    expect(result.simulatedMatches).toBe(1)
    expect(result.skippedMatches).toBe(0)
    expect(state.matches.find((m) => m.id === "m1")?.status).toBe("final")
  })

  it("simulates a full tournament and returns champion", async () => {
    state.matches = [
      makeMatch({
        id: "m1",
        matchNumber: 1,
        round: "round_of_32",
        homeTeamId: "t1",
        awayTeamId: "t2",
        homeTeamName: "Alpha",
        awayTeamName: "Bravo",
        nextMatchId: "m2",
        nextMatchSlot: "home",
      }),
      makeMatch({
        id: "m2",
        matchNumber: 9,
        round: "round_of_16",
        homeTeamId: "t7",
        awayTeamId: "t3",
        homeTeamName: "Winner M1",
        awayTeamName: "Charlie",
        nextMatchId: "m3",
        nextMatchSlot: "home",
      }),
      makeMatch({
        id: "m3",
        matchNumber: 13,
        round: "quarterfinal",
        homeTeamId: "t8",
        awayTeamId: "t4",
        homeTeamName: "Winner M2",
        awayTeamName: "Delta",
        nextMatchId: "m4",
        nextMatchSlot: "home",
      }),
      makeMatch({
        id: "m4",
        matchNumber: 15,
        round: "semifinal",
        homeTeamId: "t9",
        awayTeamId: "t5",
        homeTeamName: "Winner M3",
        awayTeamName: "Echo",
        nextMatchId: "m5",
        nextMatchSlot: "home",
      }),
      makeMatch({
        id: "m5",
        matchNumber: 16,
        round: "final",
        homeTeamId: "t10",
        awayTeamId: "t6",
        homeTeamName: "Winner M4",
        awayTeamName: "Foxtrot",
      }),
    ]

    const result = await simulateWorldCupTournament({
      challengeId: "c1",
      strategy: "home",
    })

    expect(result.rounds.length).toBe(5)
    expect(result.champion.winnerTeamId).toBe("t1")
  })

  it("resets simulated results while preserving existing picks", async () => {
    await simulateWorldCupMatchResult({
      challengeId: "c1",
      matchId: "m1",
      winnerTeamId: "t1",
      status: "final",
    })

    const picksBeforeReset = JSON.parse(JSON.stringify(state.picks))
    const result = await resetWorldCupSimulation({ challengeId: "c1" })

    expect(result.resetMatches).toBe(state.matches.length)
    expect(result.recalculated).toBe(true)
    expect(state.matches.every((match) => match.status === "scheduled")).toBe(true)
    expect(state.picks).toEqual(picksBeforeReset)
  })
})
