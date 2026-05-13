import { beforeEach, describe, expect, it, vi } from "vitest"

const challengeFindUniqueMock = vi.hoisted(() => vi.fn())
const entryFindManyMock = vi.hoisted(() => vi.fn())
const entryCreateMock = vi.hoisted(() => vi.fn())
const entryFindUniqueMock = vi.hoisted(() => vi.fn())
const seriesCountMock = vi.hoisted(() => vi.fn())
const pickCountMock = vi.hoisted(() => vi.fn())

vi.mock("@/lib/prisma", () => ({
  prisma: {
    playoffBracketChallenge: {
      findUnique: challengeFindUniqueMock,
    },
    playoffBracketEntry: {
      findMany: entryFindManyMock,
      create: entryCreateMock,
      findUnique: entryFindUniqueMock,
    },
    playoffBracketSeries: {
      count: seriesCountMock,
    },
    playoffBracketPick: {
      count: pickCountMock,
    },
  },
}))

describe("playoff entry service", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    challengeFindUniqueMock.mockResolvedValue({ id: "challenge-1" })
  })

  it("creates entry when user has fewer than 5 entries", async () => {
    entryFindManyMock.mockResolvedValue([{ id: "entry-1" }])
    entryCreateMock.mockResolvedValue({ id: "entry-2" })

    const { createPlayoffBracketEntry } = await import("@/lib/playoffs/playoffService")

    const result = await createPlayoffBracketEntry({
      challengeId: "challenge-1",
      user: { id: "user-1", name: "Tester" },
    })

    expect(result.entryId).toBe("entry-2")
    expect(result.redirectUrl).toBe("/brackets/leagues/challenge-1/entries/entry-2")
    expect(entryCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Tester's Bracket 2",
        }),
      })
    )
  })

  it("blocks 6th entry", async () => {
    entryFindManyMock.mockResolvedValue(Array.from({ length: 5 }).map((_, i) => ({ id: `entry-${i + 1}` })))

    const { createPlayoffBracketEntry } = await import("@/lib/playoffs/playoffService")

    await expect(
      createPlayoffBracketEntry({
        challengeId: "challenge-1",
        user: { id: "user-1", name: "Tester" },
      })
    ).rejects.toThrow("Entry limit reached (max 5 per user)")
  })

  it("submits a complete entry back to the pool dashboard", async () => {
    entryFindUniqueMock.mockResolvedValue({ id: "entry-2", userId: "user-1", challengeId: "challenge-1" })
    seriesCountMock.mockResolvedValue(15)
    pickCountMock.mockResolvedValue(15)

    const { submitPlayoffBracketEntry } = await import("@/lib/playoffs/playoffService")

    const result = await submitPlayoffBracketEntry({
      challengeId: "challenge-1",
      entryId: "entry-2",
      userId: "user-1",
    })

    expect(result.redirectUrl).toBe("/brackets/leagues/challenge-1")
  })

  it("provides sport-specific naming helpers", async () => {
    const { getPlayoffSportTitle } = await import("@/lib/playoffs/playoffService")
    expect(getPlayoffSportTitle("nba")).toBe("NBA Playoff Pool")
    expect(getPlayoffSportTitle("nhl")).toBe("NHL Playoff Pool")
    expect(getPlayoffSportTitle("fifa")).toBe("FIFA World Cup Pool")
  })
})
