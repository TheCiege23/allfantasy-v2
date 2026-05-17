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
      bestOf: 7,
      homeTeamName: "Celtics",
      awayTeamName: "Heat",
      sourceSeriesHome: null,
      sourceSeriesAway: null,
    },
  ],
}

function playoffGame(homeTeam: string, awayTeam: string, homeScore: number, awayScore: number, startTime: string) {
  const fullNames: Record<string, string> = {
    BOS: "Celtics",
    MIA: "Heat",
    NYK: "Knicks",
    IND: "Pacers",
  }
  return {
    homeTeam,
    awayTeam,
    homeTeamFull: fullNames[homeTeam] ?? homeTeam,
    awayTeamFull: fullNames[awayTeam] ?? awayTeam,
    homeScore,
    awayScore,
    completed: true,
    status: "STATUS_FINAL",
    statusDetail: "Final",
    startTime,
  }
}

describe("syncPlayoffChallengeSeries", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    challengeFindUniqueMock.mockResolvedValue(baseChallenge)
  })

  it("aggregates NBA final games and waits for 4 wins before setting a series winner", async () => {
    const { syncPlayoffChallengeSeries } = await import("@/lib/playoffs/playoffSeriesSyncService")
    const result = await syncPlayoffChallengeSeries({
      challengeId: "challenge-1",
      provider: async () => ({
        source: "test_provider",
        games: [
          playoffGame("BOS", "MIA", 100, 90, "2026-05-01T00:00:00.000Z"),
          playoffGame("MIA", "BOS", 88, 102, "2026-05-03T00:00:00.000Z"),
          playoffGame("BOS", "MIA", 97, 100, "2026-05-05T00:00:00.000Z"),
        ],
      }),
    })

    expect(result.seriesUpdated).toBe(1)
    expect(result.gamesMatched).toBe(3)
    expect(result.winnersUpdated).toBe(0)
    expect(seriesUpdateMock).toHaveBeenCalledWith({
      where: { id: "series-1" },
      data: expect.objectContaining({
        homeTeamName: "Celtics",
        awayTeamName: "Heat",
        status: "in_progress",
        winnerTeamName: null,
      }),
    })
  })

  it("sets winnerTeamName when the first team reaches 4 series wins", async () => {
    const { syncPlayoffChallengeSeries } = await import("@/lib/playoffs/playoffSeriesSyncService")
    const result = await syncPlayoffChallengeSeries({
      challengeId: "challenge-1",
      provider: async () => ({
        source: "test_provider",
        games: [
          playoffGame("BOS", "MIA", 100, 90, "2026-05-01T00:00:00.000Z"),
          playoffGame("MIA", "BOS", 88, 102, "2026-05-03T00:00:00.000Z"),
          playoffGame("BOS", "MIA", 97, 100, "2026-05-05T00:00:00.000Z"),
          playoffGame("MIA", "BOS", 90, 111, "2026-05-07T00:00:00.000Z"),
          playoffGame("BOS", "MIA", 100, 95, "2026-05-09T00:00:00.000Z"),
        ],
      }),
    })

    expect(result.seriesUpdated).toBe(1)
    expect(result.gamesMatched).toBe(5)
    expect(result.winnersUpdated).toBe(1)
    expect(seriesUpdateMock).toHaveBeenCalledWith({
      where: { id: "series-1" },
      data: expect.objectContaining({
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

  it("does not count live or scheduled games as series wins", async () => {
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
            completed: false,
            status: "STATUS_IN_PROGRESS",
            statusDetail: "In Progress",
            startTime: "2026-05-01T00:00:00.000Z",
          },
          {
            homeTeam: "MIA",
            awayTeam: "BOS",
            homeTeamFull: "Heat",
            awayTeamFull: "Celtics",
            completed: false,
            status: "STATUS_SCHEDULED",
            statusDetail: "Scheduled",
            startTime: "2026-05-03T00:00:00.000Z",
          },
        ],
      }),
    })

    expect(result.seriesUpdated).toBe(1)
    expect(result.winnersUpdated).toBe(0)
    expect(seriesUpdateMock).toHaveBeenCalledWith({
      where: { id: "series-1" },
      data: expect.objectContaining({
        status: "in_progress",
        winnerTeamName: null,
      }),
    })
  })

  it("returns warnings for unmatched provider games", async () => {
    const { syncPlayoffChallengeSeries } = await import("@/lib/playoffs/playoffSeriesSyncService")
    const result = await syncPlayoffChallengeSeries({
      challengeId: "challenge-1",
      provider: async () => ({
        source: "test_provider",
        games: [
          playoffGame("BOS", "MIA", 100, 90, "2026-05-01T00:00:00.000Z"),
          playoffGame("NYK", "IND", 100, 95, "2026-05-01T00:00:00.000Z"),
        ],
      }),
    })

    expect(result.seriesUpdated).toBe(1)
    expect(result.gamesMatched).toBe(1)
    expect(result.warnings).toContain("1 provider games did not match playoff series.")
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
    expect(result.attemptedProviders).toEqual(["test_provider"])
    expect(seriesUpdateMock).not.toHaveBeenCalled()
  })

  it("falls back from empty Rolling Insights rows to ESPN games", async () => {
    const { fetchLivePlayoffSeriesGames } = await import("@/lib/playoffs/playoffSeriesSyncService")
    const liveScores = await import("@/lib/sports-live-scores-service")
    vi.spyOn(liveScores, "fetchRollingInsightsScoreboard").mockResolvedValue([])
    vi.spyOn(liveScores, "fetchEspnScoreboard").mockResolvedValue([
      {
        gameId: "espn-1",
        homeTeam: "BOS",
        homeTeamFull: "Celtics",
        homeLogo: "",
        homeScore: 100,
        homeRecord: null,
        awayTeam: "MIA",
        awayTeamFull: "Heat",
        awayLogo: "",
        awayScore: 90,
        awayRecord: null,
        status: "STATUS_FINAL",
        statusDetail: "Final",
        period: 4,
        clock: "",
        completed: true,
        startTime: "2026-05-01T00:00:00.000Z",
        venue: null,
        broadcast: null,
        odds: null,
        overUnder: null,
        week: null,
        season: 2026,
      },
    ])

    const result = await fetchLivePlayoffSeriesGames({ sport: "nba", seasonYear: 2026 })

    expect(result.source).toBe("espn_live")
    expect(result.attemptedProviders).toEqual(["rolling_insights", "espn_live"])
    expect(result.games).toHaveLength(1)
    expect(result.warnings).toEqual([])
  })

  it("reports all attempted providers when Rolling Insights and ESPN are empty", async () => {
    const { fetchLivePlayoffSeriesGames } = await import("@/lib/playoffs/playoffSeriesSyncService")
    const liveScores = await import("@/lib/sports-live-scores-service")
    vi.spyOn(liveScores, "fetchRollingInsightsScoreboard").mockResolvedValue([])
    vi.spyOn(liveScores, "fetchEspnScoreboard").mockResolvedValue([])

    const result = await fetchLivePlayoffSeriesGames({ sport: "nba", seasonYear: 2026 })

    expect(result.source).toBe("espn_live")
    expect(result.attemptedProviders).toEqual(["rolling_insights", "espn_live"])
    expect(result.warnings).toContain("No NBA games returned from Rolling Insights or ESPN for season 2026.")
  })

  it("can force ESPN-only provider attempts for smoke testing", async () => {
    const { fetchLivePlayoffSeriesGames } = await import("@/lib/playoffs/playoffSeriesSyncService")
    const liveScores = await import("@/lib/sports-live-scores-service")
    const rollingSpy = vi.spyOn(liveScores, "fetchRollingInsightsScoreboard").mockResolvedValue([])
    vi.spyOn(liveScores, "fetchEspnScoreboard").mockResolvedValue([])

    const result = await fetchLivePlayoffSeriesGames({
      sport: "nba",
      seasonYear: 2026,
      providerPreference: "espn",
    })

    expect(rollingSpy).not.toHaveBeenCalled()
    expect(result.attemptedProviders).toEqual(["espn_live"])
    expect(result.warnings).toContain("No NBA games returned from ESPN for season 2026.")
  })
})
