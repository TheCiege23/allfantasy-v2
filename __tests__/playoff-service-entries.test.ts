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
const challengeCreateMock = vi.hoisted(() => vi.fn())
const seriesCreateManyMock = vi.hoisted(() => vi.fn())

vi.mock("@/lib/prisma", () => ({
  prisma: {
    playoffBracketChallenge: {
      findUnique: challengeFindUniqueMock,
      create: challengeCreateMock,
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
      createMany: seriesCreateManyMock,
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
        playoffBracketChallenge: {
          create: challengeCreateMock,
        },
        playoffBracketSeries: {
          createMany: seriesCreateManyMock,
        },
      })
    )
  })

  it("creates multiple NBA playoff challenge rows separately", async () => {
    challengeCreateMock
      .mockResolvedValueOnce({ id: "challenge-1", name: "Friends NBA Pool" })
      .mockResolvedValueOnce({ id: "challenge-2", name: "Work NBA Pool" })
    seriesCreateManyMock.mockResolvedValue({ count: 15 })

    const { createPlayoffBracketChallenge } = await import("@/lib/playoffs/playoffService")
    const first = await createPlayoffBracketChallenge({
      user: { id: "user-1" },
      name: "Friends NBA Pool",
      sport: "nba",
      seasonYear: 2026,
    })
    const second = await createPlayoffBracketChallenge({
      user: { id: "user-1" },
      name: "Work NBA Pool",
      sport: "nba",
      seasonYear: 2026,
    })

    expect(first.challengeId).toBe("challenge-1")
    expect(second.challengeId).toBe("challenge-2")
    expect(challengeCreateMock).toHaveBeenCalledTimes(2)
    expect(challengeCreateMock).toHaveBeenNthCalledWith(1, expect.objectContaining({
      data: expect.objectContaining({
        sport: "nba",
        config: expect.objectContaining({ includePlayIn: false }),
      }),
    }))
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

  it("returns provider series metadata from the playoff view", async () => {
    const now = new Date("2026-05-21T20:30:00.000Z")
    challengeFindUniqueMock.mockResolvedValue({
      id: "challenge-1",
      ownerUserId: "user-1",
      name: "NBA Pool",
      sport: "nba",
      seasonYear: 2026,
      status: "open",
      isTestMode: false,
      createdAt: now,
      updatedAt: now,
      owner: { id: "user-1", displayName: "Owner", username: null, email: null },
      entries: [
        {
          id: "entry-1",
          userId: "user-1",
          name: "Entry",
          createdAt: now,
          user: { id: "user-1", displayName: "Owner", username: null, email: null },
        },
      ],
      series: [
        {
          id: "s1",
          round: "round_1",
          roundIndex: 1,
          seriesNumber: 1,
          conference: "east",
          homeSeed: 1,
          awaySeed: 8,
          homeTeamName: "Knicks",
          awayTeamName: "Hawks",
          winnerTeamName: "Knicks",
          bestOf: 7,
          status: "final",
          startsAt: now,
          homeTeamWins: 4,
          awayTeamWins: 0,
          seriesSummary: "Knicks win series 4-0",
          nextGameAt: null,
          venue: "Madison Square Garden",
          broadcastNetwork: "TNT",
          liveHomeScore: null,
          liveAwayScore: null,
          liveStatus: null,
          providerGamesJson: [{ homeTeam: "Knicks", awayTeam: "Hawks" }],
          lastSyncedAt: now,
          nextSeriesNumber: 9,
          nextSeriesSlot: "home",
          sourceSeriesHome: null,
          sourceSeriesAway: null,
        },
      ],
    })
    pickFindManyMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    const { getPlayoffBracketView } = await import("@/lib/playoffs/playoffService")
    const view = await getPlayoffBracketView({
      challengeId: "challenge-1",
      user: { id: "user-1" },
      requestedEntryId: "entry-1",
    })

    expect(view?.series[0]).toMatchObject({
      homeTeamWins: 4,
      awayTeamWins: 0,
      seriesSummary: "Knicks win series 4-0",
      venue: "Madison Square Garden",
      broadcastNetwork: "TNT",
      providerGamesJson: [{ homeTeam: "Knicks", awayTeam: "Hawks" }],
    })
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
    ).rejects.toThrow("Series already started/locked")

    expect(pickUpsertMock).not.toHaveBeenCalled()
  })

  it("allows provider-synced later-round picks without earlier user picks when unlocked", async () => {
    entryFindUniqueMock.mockResolvedValue({ id: "entry-1", userId: "user-1", challengeId: "challenge-1" })
    seriesFindUniqueMock.mockResolvedValue({
      id: "s9",
      challengeId: "challenge-1",
      status: "scheduled",
      startsAt: null,
      homeTeamName: "Celtics",
      awayTeamName: "Knicks",
    })
    seriesFindManyMock.mockResolvedValue([
      {
        id: "s1",
        challengeId: "challenge-1",
        roundIndex: 1,
        seriesNumber: 1,
        homeTeamName: "Celtics",
        awayTeamName: "Hawks",
        sourceSeriesHome: null,
        sourceSeriesAway: null,
      },
      {
        id: "s2",
        challengeId: "challenge-1",
        roundIndex: 1,
        seriesNumber: 2,
        homeTeamName: "Knicks",
        awayTeamName: "76ers",
        sourceSeriesHome: null,
        sourceSeriesAway: null,
      },
      {
        id: "s9",
        challengeId: "challenge-1",
        roundIndex: 2,
        seriesNumber: 9,
        homeTeamName: "Celtics",
        awayTeamName: "Knicks",
        sourceSeriesHome: 1,
        sourceSeriesAway: 2,
      },
    ])
    pickFindManyMock.mockResolvedValue([])
    pickUpsertMock.mockResolvedValue({ id: "p9", seriesId: "s9", pickTeamName: "Celtics" })

    const { savePlayoffBracketPick } = await import("@/lib/playoffs/playoffService")
    await savePlayoffBracketPick({
      challengeId: "challenge-1",
      entryId: "entry-1",
      userId: "user-1",
      seriesId: "s9",
      pickTeamName: "Celtics",
    })

    expect(pickUpsertMock).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ seriesId: "s9", pickTeamName: "Celtics" }),
    }))
  })
})
