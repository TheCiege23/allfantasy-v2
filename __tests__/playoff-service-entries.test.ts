import { beforeEach, describe, expect, it, vi } from "vitest"

const challengeFindUniqueMock = vi.hoisted(() => vi.fn())
const entryFindManyMock = vi.hoisted(() => vi.fn())
const entryCreateMock = vi.hoisted(() => vi.fn())
const entryFindUniqueMock = vi.hoisted(() => vi.fn())
const seriesCountMock = vi.hoisted(() => vi.fn())
const pickCountMock = vi.hoisted(() => vi.fn())
const seriesFindUniqueMock = vi.hoisted(() => vi.fn())
const seriesFindManyMock = vi.hoisted(() => vi.fn())
const pickFindManyMock = vi.hoisted(() => vi.fn())
const pickDeleteManyMock = vi.hoisted(() => vi.fn())
const pickUpsertMock = vi.hoisted(() => vi.fn())
const transactionMock = vi.hoisted(() => vi.fn())

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
      findUnique: seriesFindUniqueMock,
      findMany: seriesFindManyMock,
    },
    playoffBracketPick: {
      count: pickCountMock,
      findMany: pickFindManyMock,
      deleteMany: pickDeleteManyMock,
      upsert: pickUpsertMock,
    },
    $transaction: transactionMock,
  },
}))

describe("playoff entry service", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    challengeFindUniqueMock.mockResolvedValue({ id: "challenge-1" })
    transactionMock.mockImplementation((callback) =>
      callback({
        playoffBracketPick: {
          deleteMany: pickDeleteManyMock,
          upsert: pickUpsertMock,
        },
      })
    )
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

  it("clears downstream picks when an earlier pick changes", async () => {
    entryFindUniqueMock.mockResolvedValue({ id: "entry-1", userId: "user-1", challengeId: "challenge-1" })
    seriesFindUniqueMock.mockResolvedValue({
      id: "s1",
      challengeId: "challenge-1",
      status: "scheduled",
      startsAt: null,
      homeTeamName: "Celtics",
      awayTeamName: "Heat",
    })
    seriesFindManyMock.mockResolvedValue([
      {
        id: "s1",
        challengeId: "challenge-1",
        roundIndex: 1,
        seriesNumber: 1,
        homeTeamName: "Celtics",
        awayTeamName: "Heat",
        sourceSeriesHome: null,
        sourceSeriesAway: null,
      },
      {
        id: "s9",
        challengeId: "challenge-1",
        roundIndex: 2,
        seriesNumber: 9,
        homeTeamName: "Winner S1",
        awayTeamName: "Winner S2",
        sourceSeriesHome: 1,
        sourceSeriesAway: 2,
      },
    ])
    pickFindManyMock.mockResolvedValue([{ id: "p9", entryId: "entry-1", seriesId: "s9", pickTeamName: "Celtics" }])
    pickUpsertMock.mockResolvedValue({ id: "p1", seriesId: "s1", pickTeamName: "Heat" })

    const { savePlayoffBracketPick } = await import("@/lib/playoffs/playoffService")
    await savePlayoffBracketPick({
      challengeId: "challenge-1",
      entryId: "entry-1",
      userId: "user-1",
      seriesId: "s1",
      pickTeamName: "Heat",
    })

    expect(pickDeleteManyMock).toHaveBeenCalledWith({
      where: {
        entryId: "entry-1",
        seriesId: { in: ["s9"] },
      },
    })
  })

  it("rejects locked series picks server-side", async () => {
    entryFindUniqueMock.mockResolvedValue({ id: "entry-1", userId: "user-1", challengeId: "challenge-1" })
    seriesFindUniqueMock.mockResolvedValue({
      id: "s1",
      challengeId: "challenge-1",
      status: "in_progress",
      startsAt: null,
      homeTeamName: "Celtics",
      awayTeamName: "Heat",
    })

    const { savePlayoffBracketPick } = await import("@/lib/playoffs/playoffService")
    await expect(
      savePlayoffBracketPick({
        challengeId: "challenge-1",
        entryId: "entry-1",
        userId: "user-1",
        seriesId: "s1",
        pickTeamName: "Celtics",
      })
    ).rejects.toThrow("Picks are locked for this series")

    expect(pickUpsertMock).not.toHaveBeenCalled()
  })
})
