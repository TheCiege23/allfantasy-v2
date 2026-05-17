import { beforeEach, describe, expect, it, vi } from "vitest"

const challengeFindUniqueMock = vi.hoisted(() => vi.fn())
const seriesUpdateMock = vi.hoisted(() => vi.fn())

vi.mock("@/lib/prisma", () => ({
  prisma: {
    playoffBracketChallenge: {
      findUnique: challengeFindUniqueMock,
    },
    playoffBracketSeries: {
      update: seriesUpdateMock,
    },
  },
}))

const baseChallenge = {
  id: "challenge-1",
  sport: "nba",
  seasonYear: 2026,
  series: [
    {
      id: "series-1",
      roundIndex: 1,
      seriesNumber: 1,
      homeTeamName: "Celtics",
      awayTeamName: "Heat",
      sourceSeriesHome: null,
      sourceSeriesAway: null,
    },
  ],
}

describe("syncPlayoffChallengeSeries", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    challengeFindUniqueMock.mockResolvedValue(baseChallenge)
  })

  it("maps NBA provider games into first-round playoff series", async () => {
    const { syncPlayoffChallengeSeries } = await import("@/lib/playoffs/playoffSeriesSyncService")
    const result = await syncPlayoffChallengeSeries({
      challengeId: "challenge-1",
      provider: async () => ({
        source: "test_provider",
        games: [
          {
            homeTeam: "BOS",
            awayTeam: "MIA",
            homeTeamFull: "Celtics",
            awayTeamFull: "Heat",
            homeScore: 100,
            awayScore: 90,
            completed: true,
            statusDetail: "Final",
            startTime: "2026-05-01T00:00:00.000Z",
          },
        ],
      }),
    })

    expect(result.seriesUpdated).toBe(1)
    expect(result.winnersUpdated).toBe(1)
    expect(seriesUpdateMock).toHaveBeenCalledWith({
      where: { id: "series-1" },
      data: expect.objectContaining({
        homeTeamName: "Celtics",
        awayTeamName: "Heat",
        status: "final",
        winnerTeamName: "Celtics",
      }),
    })
  })

  it("maps NHL provider games into playoff series", async () => {
    challengeFindUniqueMock.mockResolvedValue({
      ...baseChallenge,
      sport: "nhl",
      series: [
        {
          ...baseChallenge.series[0],
          homeTeamName: "Rangers",
          awayTeamName: "Islanders",
        },
      ],
    })

    const { syncPlayoffChallengeSeries } = await import("@/lib/playoffs/playoffSeriesSyncService")
    const result = await syncPlayoffChallengeSeries({
      challengeId: "challenge-1",
      provider: async () => ({
        source: "test_provider",
        games: [
          {
            homeTeam: "NYR",
            awayTeam: "NYI",
            homeTeamFull: "Rangers",
            awayTeamFull: "Islanders",
            completed: false,
            statusDetail: "Scheduled",
            startTime: "2026-05-01T00:00:00.000Z",
          },
        ],
      }),
    })

    expect(result.sport).toBe("nhl")
    expect(result.seriesUpdated).toBe(1)
    expect(seriesUpdateMock).toHaveBeenCalledWith({
      where: { id: "series-1" },
      data: expect.objectContaining({
        status: "scheduled",
        winnerTeamName: null,
      }),
    })
  })

  it("does not overwrite user picks and returns structured warning when provider data is missing", async () => {
    const { syncPlayoffChallengeSeries } = await import("@/lib/playoffs/playoffSeriesSyncService")
    const result = await syncPlayoffChallengeSeries({
      challengeId: "challenge-1",
      provider: async () => ({
        source: "test_provider",
        games: [],
        warnings: ["No NBA games returned from test_provider."],
      }),
    })

    expect(result.ok).toBe(false)
    expect(result.warnings).toContain("No NBA games returned from test_provider.")
    expect(result.warnings).toContain("No playoff series matched provider games.")
    expect(seriesUpdateMock).not.toHaveBeenCalled()
  })
})
