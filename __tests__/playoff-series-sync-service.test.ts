import { beforeEach, describe, expect, it, vi } from "vitest"

const challengeFindUniqueMock = vi.hoisted(() => vi.fn())
const seriesUpdateMock = vi.hoisted(() => vi.fn())
const pickDeleteManyMock = vi.hoisted(() => vi.fn())

vi.mock("@/lib/prisma", () => ({
  prisma: {
    playoffBracketChallenge: {
      findUnique: challengeFindUniqueMock,
    },
    playoffBracketSeries: {
      update: seriesUpdateMock,
    },
    playoffBracketPick: {
      deleteMany: pickDeleteManyMock,
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
    vi.restoreAllMocks()
    vi.clearAllMocks()
    vi.stubEnv("ROLLING_INSIGHTS_RSC_TOKEN", "test-rsc-token")
    challengeFindUniqueMock.mockResolvedValue(baseChallenge)
    pickDeleteManyMock.mockResolvedValue({ count: 0 })
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

  it("counts ignored Play-In games separately from true unmatched games", async () => {
    const { syncPlayoffChallengeSeries } = await import("@/lib/playoffs/playoffSeriesSyncService")
    const result = await syncPlayoffChallengeSeries({
      challengeId: "challenge-1",
      provider: async () => ({
        source: "test_provider",
        games: [
          {
            ...playoffGame("BOS", "MIA", 100, 90, "2026-05-01T00:00:00.000Z"),
            eventName: "East 1st Round:",
            seasonType: "Postseason",
          },
          {
            ...playoffGame("NYK", "IND", 100, 95, "2026-04-15T00:00:00.000Z"),
            eventName: "East Play-In Tournament",
            seasonType: "Postseason",
          },
        ],
      }),
    })

    expect(result.seriesUpdated).toBe(1)
    expect(result.diagnostics.ignoredPlayInGames).toBe(1)
    expect(result.warnings).toContain("1 Play-In games ignored because this pool does not include Play-In picks.")
    expect(result.warnings).not.toContain("1 provider games did not match playoff series.")
    expect(result.unmatchedExamples).toEqual([])
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

  it("returns safe diagnostics when provider games do not match existing series", async () => {
    const { syncPlayoffChallengeSeries } = await import("@/lib/playoffs/playoffSeriesSyncService")
    const result = await syncPlayoffChallengeSeries({
      challengeId: "challenge-1",
      provider: async () => ({
        source: "test_provider",
        games: [playoffGame("NYK", "IND", 100, 95, "2026-05-01T00:00:00.000Z")],
        attemptedProviders: ["test_provider"],
        diagnostics: {
          seasonYear: 2026,
          sport: "nba",
          selectedProvider: "test_provider",
          providerAttempts: [{ provider: "test_provider", source: "test_provider", seasonYear: 2026, sport: "nba", gamesReturned: 1, postseasonGames: 0 }],
          existingSeriesExamples: [],
          providerGameExamples: [],
          providerSeriesExamples: [],
        },
      }),
    })

    expect(result.seriesUpdated).toBe(0)
    expect(result.warnings).toContain("No playoff series matched provider games.")
    expect(result.diagnostics.existingSeriesExamples[0]).toMatchObject({ homeTeam: "Celtics", awayTeam: "Heat" })
    expect(result.diagnostics.providerGameExamples[0]).toMatchObject({ homeTeam: "Knicks", awayTeam: "Pacers" })
    expect(result.unmatchedExamples[0]).toMatchObject({ homeTeam: "Knicks", awayTeam: "Pacers" })
  })

  it("falls back from empty Rolling Insights rows to ESPN games", async () => {
    const { fetchLivePlayoffSeriesGames } = await import("@/lib/playoffs/playoffSeriesSyncService")
    const liveScores = await import("@/lib/sports-live-scores-service")
    vi.spyOn(liveScores, "fetchRollingInsightsScheduleSeason").mockResolvedValue([])
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

    expect(result.source).toBe("rolling_insights")
    expect(result.attemptedProviders).toEqual(["rolling_insights_schedule_season", "rolling_insights"])
    expect(result.games).toHaveLength(0)
    expect(result.warnings).toContain("No NBA games returned from Rolling Insights schedule-season or Rolling Insights for season 2026.")
  })

  it("reports all attempted providers when Rolling Insights and ESPN are empty", async () => {
    const { fetchLivePlayoffSeriesGames } = await import("@/lib/playoffs/playoffSeriesSyncService")
    const liveScores = await import("@/lib/sports-live-scores-service")
    vi.spyOn(liveScores, "fetchRollingInsightsScoreboard").mockResolvedValue([])
    vi.spyOn(liveScores, "fetchEspnScoreboard").mockResolvedValue([])

    const result = await fetchLivePlayoffSeriesGames({ sport: "nba", seasonYear: 2026 })

    expect(result.source).toBe("rolling_insights")
    expect(result.attemptedProviders).toEqual(["rolling_insights_schedule_season", "rolling_insights"])
    expect(result.warnings).toContain("No NBA games returned from Rolling Insights schedule-season or Rolling Insights for season 2026.")
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

  it("normalizes NBA schedule-season postseason rows and updates template teams", async () => {
    const liveScores = await import("@/lib/sports-live-scores-service")
    vi.spyOn(liveScores, "fetchRollingInsightsScheduleSeasonWithDiagnostics").mockResolvedValue(scheduleResult("NBA", 2026, [
      scheduleRow("NBA", "Postseason", "First Round", 1, "Boston Celtics", "Miami Heat", "scheduled", "2026-04-20T00:00:00.000Z"),
      scheduleRow("NBA", "Regular Season", "Regular Season", 0, "Lakers", "Warriors", "final", "2026-01-01T00:00:00.000Z"),
    ] as any))
    challengeFindUniqueMock.mockResolvedValue({
      ...baseChallenge,
      series: [{ ...baseChallenge.series[0], homeTeamName: "E1", awayTeamName: "E8" }],
    })

    const { syncPlayoffChallengeSeries } = await import("@/lib/playoffs/playoffSeriesSyncService")
    const result = await syncPlayoffChallengeSeries({ challengeId: "challenge-1" })

    expect(result.source).toBe("rolling_insights_schedule_season")
    expect(result.postseasonGames).toBe(1)
    expect(result.seriesReturned).toBe(1)
    expect(result.seriesMatched).toBe(1)
    expect(seriesUpdateMock).toHaveBeenCalledWith({
      where: { id: "series-1" },
      data: expect.objectContaining({
        homeTeamName: "Boston Celtics",
        awayTeamName: "Miami Heat",
        status: "scheduled",
        winnerTeamName: null,
      }),
    })
  })

  it("maps NBA event names to bracket rounds and ignores play-in rows", async () => {
    const liveScores = await import("@/lib/sports-live-scores-service")
    vi.spyOn(liveScores, "fetchRollingInsightsScheduleSeasonWithDiagnostics").mockResolvedValue(scheduleResult("NBA", 2026, [
      scheduleRow("NBA", "Postseason", "East Play-In Tournament", null as any, "Bulls", "Hawks", "completed", "2026-04-15T00:00:00.000Z", 100, 90),
      scheduleRow("NBA", "Postseason", "West Play-In Tournament", null as any, "Kings", "Mavericks", "completed", "2026-04-15T00:00:00.000Z", 100, 90),
      scheduleRow("NBA", "Postseason", "East 1st Round:", null as any, "Celtics", "76ers", "scheduled", "2026-04-20T00:00:00.000Z"),
      scheduleRow("NBA", "Postseason", "West 1st Round:", null as any, "Thunder", "Warriors", "scheduled", "2026-04-20T00:00:00.000Z"),
      scheduleRow("NBA", "Postseason", "East Semifinals", 4, "Celtics", "Magic", "scheduled", "2026-05-01T00:00:00.000Z"),
      scheduleRow("NBA", "Postseason", "Conference Finals", null as any, "Celtics", "Knicks", "scheduled", "2026-05-15T00:00:00.000Z"),
      scheduleRow("NBA", "Postseason", "NBA Finals", null as any, "Celtics", "Thunder", "scheduled", "2026-06-01T00:00:00.000Z"),
    ] as any))
    vi.spyOn(liveScores, "fetchRollingInsightsScoreboard").mockResolvedValue([])
    challengeFindUniqueMock.mockResolvedValue({
      ...baseChallenge,
      series: [
        { ...baseChallenge.series[0], id: "series-1", roundIndex: 1, conference: "east", seriesNumber: 1, homeTeamName: "E1", awayTeamName: "E8" },
        { ...baseChallenge.series[0], id: "series-5", roundIndex: 1, conference: "west", seriesNumber: 5, homeTeamName: "W1", awayTeamName: "W8" },
      ],
    })

    const { syncPlayoffChallengeSeries } = await import("@/lib/playoffs/playoffSeriesSyncService")
    const result = await syncPlayoffChallengeSeries({ challengeId: "challenge-1" })

    expect(result.seriesReturned).toBe(5)
    expect(result.diagnostics.ignoredPlayInGames).toBe(2)
    expect(result.diagnostics.providerSeriesByRound).toMatchObject({ "1": 2, "2": 1, "3": 1, "4": 1 })
    expect(result.diagnostics.eventNameRoundMapExamples).toEqual(expect.arrayContaining([
      expect.objectContaining({ eventName: "East Play-In Tournament", round: null, ignored: true }),
      expect.objectContaining({ eventName: "East 1st Round:", round: 1 }),
      expect.objectContaining({ eventName: "West 1st Round:", round: 1 }),
      expect.objectContaining({ eventName: "East Semifinals", round: 2 }),
      expect.objectContaining({ eventName: "Conference Finals", round: 3 }),
      expect.objectContaining({ eventName: "NBA Finals", round: 4 }),
    ]))
  })

  it("maps NHL event names to bracket rounds", async () => {
    const liveScores = await import("@/lib/sports-live-scores-service")
    vi.spyOn(liveScores, "fetchRollingInsightsScheduleSeasonWithDiagnostics").mockResolvedValue(scheduleResult("NHL", 2026, [
      scheduleRow("NHL", "Postseason", "First Round", null as any, "Panthers", "Lightning", "scheduled", "2026-04-20T00:00:00.000Z"),
      scheduleRow("NHL", "Postseason", "Second Round", null as any, "Panthers", "Maple Leafs", "scheduled", "2026-05-01T00:00:00.000Z"),
      scheduleRow("NHL", "Postseason", "Conference Finals", null as any, "Panthers", "Hurricanes", "scheduled", "2026-05-15T00:00:00.000Z"),
      scheduleRow("NHL", "Postseason", "Stanley Cup Final", null as any, "Panthers", "Oilers", "scheduled", "2026-06-01T00:00:00.000Z"),
    ] as any))
    challengeFindUniqueMock.mockResolvedValue({
      ...baseChallenge,
      sport: "nhl",
      series: [{ ...baseChallenge.series[0], roundIndex: 1, conference: "east", homeTeamName: "E1", awayTeamName: "E8" }],
    })

    const { syncPlayoffChallengeSeries } = await import("@/lib/playoffs/playoffSeriesSyncService")
    const result = await syncPlayoffChallengeSeries({ challengeId: "challenge-1" })

    expect(result.diagnostics.providerSeriesByRound).toMatchObject({ "1": 1, "2": 1, "3": 1, "4": 1 })
    expect(result.diagnostics.eventNameRoundMapExamples).toEqual(expect.arrayContaining([
      expect.objectContaining({ eventName: "First Round", round: 1 }),
      expect.objectContaining({ eventName: "Second Round", round: 2 }),
      expect.objectContaining({ eventName: "Conference Finals", round: 3 }),
      expect.objectContaining({ eventName: "Stanley Cup Final", round: 4 }),
    ]))
  })

  it("builds multiple provider series from a 74-game NBA postseason sample and replaces first-round templates", async () => {
    const liveScores = await import("@/lib/sports-live-scores-service")
    const rows = [
      ...repeatSeriesGames("East Play-In Tournament", "Bulls", "Hawks", 2),
      ...repeatSeriesGames("East 1st Round:", "Celtics", "76ers", 4),
      ...repeatSeriesGames("East 1st Round:", "Cavaliers", "Magic", 4),
      ...repeatSeriesGames("East 1st Round:", "Knicks", "Heat", 4),
      ...repeatSeriesGames("East 1st Round:", "Bucks", "Pacers", 4),
      ...repeatSeriesGames("West 1st Round:", "Thunder", "Warriors", 4),
      ...repeatSeriesGames("West 1st Round:", "Nuggets", "Lakers", 4),
      ...repeatSeriesGames("West 1st Round:", "Timberwolves", "Suns", 4),
      ...repeatSeriesGames("West 1st Round:", "Mavericks", "Pelicans", 4),
      ...repeatSeriesGames("East Semifinals", "Celtics", "Magic", 4),
      ...repeatSeriesGames("East Semifinals", "Knicks", "Pacers", 4),
      ...repeatSeriesGames("West Semifinals", "Thunder", "Lakers", 4),
      ...repeatSeriesGames("West Semifinals", "Timberwolves", "Mavericks", 4),
      ...repeatSeriesGames("Conference Finals", "Celtics", "Knicks", 5),
      ...repeatSeriesGames("Conference Finals", "Thunder", "Timberwolves", 5),
      ...repeatSeriesGames("NBA Finals", "Celtics", "Thunder", 14),
    ]
    vi.spyOn(liveScores, "fetchRollingInsightsScheduleSeasonWithDiagnostics").mockResolvedValue(scheduleResult("NBA", 2026, rows as any))
    challengeFindUniqueMock.mockResolvedValue({
      ...baseChallenge,
      series: [
        firstRoundSeries("s1", 1, "east", "Celtics", "76ers"),
        firstRoundSeries("s2", 2, "east", "Cavaliers", "Magic"),
        firstRoundSeries("s3", 3, "east", "Knicks", "Heat"),
        firstRoundSeries("s4", 4, "east", "Bucks", "Pacers"),
        firstRoundSeries("s5", 5, "west", "Thunder", "Warriors"),
        firstRoundSeries("s6", 6, "west", "Nuggets", "Lakers"),
        firstRoundSeries("s7", 7, "west", "Timberwolves", "Suns"),
        firstRoundSeries("s8", 8, "west", "Mavericks", "Pelicans"),
      ],
    })

    const { syncPlayoffChallengeSeries } = await import("@/lib/playoffs/playoffSeriesSyncService")
    const result = await syncPlayoffChallengeSeries({ challengeId: "challenge-1" })

    expect(result.postseasonGames).toBe(74)
    expect(result.seriesReturned).toBeGreaterThanOrEqual(15)
    expect(result.seriesUpdated).toBe(8)
    expect(result.diagnostics.templateReplacementCount).toBe(8)
    expect(result.diagnostics.ignoredPlayInGames).toBe(2)
    expect(result.diagnostics.providerSeriesByRound).toMatchObject({ "1": 8, "2": 4, "3": 2, "4": 1 })
    expect(result.diagnostics.updatedSeriesExamples[0]).toMatchObject({
      round: 1,
      oldHomeTeam: "Celtics",
      oldAwayTeam: "76ers",
      newHomeTeam: "Celtics",
      newAwayTeam: "76ers",
      eventName: "East 1st Round:",
      status: "scheduled",
    })
  })

  it("clears invalid picks when provider teams replace template teams", async () => {
    const liveScores = await import("@/lib/sports-live-scores-service")
    vi.spyOn(liveScores, "fetchRollingInsightsScheduleSeasonWithDiagnostics").mockResolvedValue(scheduleResult("NBA", 2026, [
      scheduleRow("NBA", "Postseason", "East 1st Round:", null as any, "Celtics", "76ers", "scheduled", "2026-04-20T00:00:00.000Z"),
    ] as any))
    challengeFindUniqueMock.mockResolvedValue({
      ...baseChallenge,
      series: [firstRoundSeries("series-1", 1, "east", "E1", "E8")],
    })

    const { syncPlayoffChallengeSeries } = await import("@/lib/playoffs/playoffSeriesSyncService")
    await syncPlayoffChallengeSeries({ challengeId: "challenge-1" })

    expect(pickDeleteManyMock).toHaveBeenCalledWith({
      where: expect.objectContaining({
        challengeId: "challenge-1",
        seriesId: { in: ["series-1"] },
        NOT: { pickTeamName: { in: expect.arrayContaining(["Celtics", "76ers"]) } },
      }),
    })
  })

  it("selects the season-start provider year when 2026 has no postseason rows and 2025 does", async () => {
    const liveScores = await import("@/lib/sports-live-scores-service")
    const scheduleSpy = vi.spyOn(liveScores, "fetchRollingInsightsScheduleSeasonWithDiagnostics").mockImplementation(async (sport, seasonYear) => {
      if (seasonYear === 2025) {
        return scheduleResult(sport as "NBA" | "NHL", seasonYear, [
          scheduleRow("NBA", "Postseason", "First Round", 1, "Boston Celtics", "Miami Heat", "scheduled", "2026-04-20T00:00:00.000Z"),
        ] as any)
      }
      return scheduleResult(sport as "NBA" | "NHL", seasonYear, [])
    })
    const espnSpy = vi.spyOn(liveScores, "fetchEspnScoreboard").mockResolvedValue([])
    challengeFindUniqueMock.mockResolvedValue({
      ...baseChallenge,
      seasonYear: 2026,
      series: [{ ...baseChallenge.series[0], homeTeamName: "E1", awayTeamName: "E8" }],
    })

    const { syncPlayoffChallengeSeries } = await import("@/lib/playoffs/playoffSeriesSyncService")
    const result = await syncPlayoffChallengeSeries({ challengeId: "challenge-1" })

    expect(scheduleSpy).toHaveBeenCalledWith("NBA", 2026)
    expect(scheduleSpy).toHaveBeenCalledWith("NBA", 2025)
    expect(espnSpy).not.toHaveBeenCalled()
    expect(result.challengeSeasonYear).toBe(2026)
    expect(result.selectedProviderSeason).toBe(2025)
    expect(result.providerSeasonAttempts).toEqual([
      expect.objectContaining({ seasonYear: 2026, rowsReturned: 0, postseasonRows: 0 }),
      expect.objectContaining({ seasonYear: 2025, rowsReturned: 1, postseasonRows: 1 }),
    ])
    expect(result.diagnostics.selectedProviderSeason).toBe(2025)
    expect(result.diagnostics.seasonSelectionExplanation).toBe("Rolling Insights uses season start year; 2025 was selected for the 2025-26 season.")
    expect(result.seriesUpdated).toBe(1)
    expect(seriesUpdateMock).toHaveBeenCalledWith({
      where: { id: "series-1" },
      data: expect.objectContaining({
        homeTeamName: "Boston Celtics",
        awayTeamName: "Miami Heat",
      }),
    })
  })

  it("parses nested NBA schedule-season response keys and filters postseason case-insensitively", async () => {
    const liveScores = await import("@/lib/sports-live-scores-service")
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      text: async () => JSON.stringify({
        NBA: [
          {
            game_ID: "nested-1",
            season_type: "postseason",
            event_name: "First Round",
            round: 1,
            home_team: "Boston Celtics",
            away_team: "Miami Heat",
            game_time: "2026-04-20T00:00:00.000Z",
            status: "scheduled",
          },
        ],
      }),
    } as Response)

    const rows = await liveScores.fetchRollingInsightsScheduleSeason("NBA", 2026, { forceRefresh: true })
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ seasonType: "postseason", homeTeam: "Boston Celtics", awayTeam: "Miami Heat" })

    const { fetchRollingInsightsPostseasonScheduleGames } = await import("@/lib/playoffs/playoffSeriesSyncService")
    const result = await fetchRollingInsightsPostseasonScheduleGames({ sport: "nba", seasonYear: 2026 })
    expect(result.games).toHaveLength(1)
  })

  it("builds the same direct schedule-season URL shape as the proof audit", async () => {
    const liveScores = await import("@/lib/sports-live-scores-service")

    expect(liveScores.buildRollingInsightsScheduleSeasonUrl({ sport: "NBA", seasonYear: 2025, token: "secret" }))
      .toBe("https://rest.datafeeds.rolling-insights.com/api/v1/schedule-season/2025/NBA?RSC_token=secret")
    expect(liveScores.buildRollingInsightsScheduleSeasonUrl({ sport: "NHL", seasonYear: 2025, redacted: true }))
      .toBe("https://rest.datafeeds.rolling-insights.com/api/v1/schedule-season/2025/NHL?RSC_token=%3Credacted%3E")
  })

  it("parses all rows from nested NBA schedule-season responses", async () => {
    const rows = Array.from({ length: 1379 }).map((_, index) => ({
      game_ID: `game-${index}`,
      season_type: index < 74 ? "Postseason" : "Regular Season",
      event_name: index < 74 ? "First Round" : "Regular Season",
      round: index < 74 ? 1 : 0,
      home_team: `Home ${index}`,
      away_team: `Away ${index}`,
      game_time: "2026-04-20T00:00:00.000Z",
      status: "scheduled",
    }))
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      text: async () => JSON.stringify({ data: { NBA: rows } }),
    } as Response)

    const liveScores = await import("@/lib/sports-live-scores-service")
    const result = await liveScores.fetchRollingInsightsScheduleSeasonWithDiagnostics("NBA", 2025)

    expect(result.rows).toHaveLength(1379)
    expect(result.rows.filter((row) => row.seasonType === "Postseason")).toHaveLength(74)
    expect(result.diagnostics.dataKeys).toContain("NBA")
    expect(result.diagnostics.sanitizedUrl).toContain("/schedule-season/2025/NBA")
    expect(result.diagnostics.sanitizedUrl).not.toContain("test-rsc-token")
  })

  it("does not count a Rolling Insights error object as a schedule row", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      text: async () => JSON.stringify({ error: "Unauthorized", message: "Bad token" }),
    } as Response)

    const liveScores = await import("@/lib/sports-live-scores-service")
    const result = await liveScores.fetchRollingInsightsScheduleSeasonWithDiagnostics("NBA", 2025)

    expect(result.rows).toHaveLength(0)
    expect(result.diagnostics.topLevelKeys).toEqual(["error", "message"])
    expect(result.diagnostics.firstItemKeys).toEqual([])
  })

  it("includes response shape when one non-postseason row is returned", async () => {
    const liveScores = await import("@/lib/sports-live-scores-service")
    vi.spyOn(liveScores, "fetchRollingInsightsScheduleSeasonWithDiagnostics").mockResolvedValue({
      rows: [
        scheduleRow("NBA", "Regular Season", "Regular Season", 0, "Celtics", "Heat", "scheduled", "2026-01-01T00:00:00.000Z"),
      ] as any,
      diagnostics: {
        httpStatus: 200,
        contentType: "application/json",
        topLevelKeys: ["data"],
        dataKeys: ["NBA"],
        firstItemKeys: ["season_type", "event_name", "home_team", "away_team"],
        firstItemSafeFields: {
          season_type: "Regular Season",
          event_name: "Regular Season",
          home_team: "Celtics",
          away_team: "Heat",
        },
        textPreview: null,
        rollingInsightsTokenPresent: true,
        tokenEnvNameUsed: "ROLLING_INSIGHTS_RSC_TOKEN",
        baseUrlUsed: "https://rest.datafeeds.rolling-insights.com/api/v1",
        endpointKind: "schedule-season",
        sanitizedUrl: "https://rest.datafeeds.rolling-insights.com/api/v1/schedule-season/2026/NBA?RSC_token=<redacted>",
      },
    })
    vi.spyOn(liveScores, "fetchRollingInsightsScoreboard").mockResolvedValue([])

    const { fetchLivePlayoffSeriesGames } = await import("@/lib/playoffs/playoffSeriesSyncService")
    const result = await fetchLivePlayoffSeriesGames({ sport: "nba", seasonYear: 2026 })

    expect(result.diagnostics.providerSeasonAttempts[0]).toMatchObject({
      rowsReturned: 1,
      postseasonRows: 0,
      responseShape: expect.objectContaining({
        firstItemSafeFields: expect.objectContaining({ season_type: "Regular Season" }),
        tokenEnvNameUsed: "ROLLING_INSIGHTS_RSC_TOKEN",
      }),
    })
  })

  it("returns clear schedule diagnostics when the Rolling Insights token is missing", async () => {
    vi.stubEnv("ROLLING_INSIGHTS_RSC_TOKEN", "")
    vi.stubEnv("ROLLING_INSIGHTS_RSC_TOKEN2", "")
    vi.stubEnv("RSC_TOKEN", "")
    vi.stubEnv("ROLLING_INSIGHTS_CLIENT_SECRET", "")
    vi.stubEnv("ROLLING_INSIGHTS_CLIENT_SECRET2", "")
    const liveScores = await import("@/lib/sports-live-scores-service")

    const result = await liveScores.fetchRollingInsightsScheduleSeasonWithDiagnostics("NBA", 2025)

    expect(result.rows).toHaveLength(0)
    expect(result.diagnostics.rollingInsightsTokenPresent).toBe(false)
    expect(result.diagnostics.tokenEnvNameUsed).toBeNull()
    expect(result.diagnostics.textPreview).toContain("Missing Rolling Insights RSC token")
  })

  it("normalizes NHL schedule-season postseason rows and maps Stanley Cup Final to round 4", async () => {
    const liveScores = await import("@/lib/sports-live-scores-service")
    vi.spyOn(liveScores, "fetchRollingInsightsScheduleSeasonWithDiagnostics").mockResolvedValue(scheduleResult("NHL", 2026, [
      scheduleRow("NHL", "Postseason", "Stanley Cup Final", 4, "Panthers", "Oilers", "completed", "2026-06-01T00:00:00.000Z", 4, 1),
    ] as any))
    challengeFindUniqueMock.mockResolvedValue({
      ...baseChallenge,
      sport: "nhl",
      series: [{ ...baseChallenge.series[0], roundIndex: 4, homeTeamName: "Winner East", awayTeamName: "Winner West" }],
    })

    const { syncPlayoffChallengeSeries } = await import("@/lib/playoffs/playoffSeriesSyncService")
    const result = await syncPlayoffChallengeSeries({ challengeId: "challenge-1" })

    expect(result.sport).toBe("nhl")
    expect(result.postseasonGames).toBe(1)
    expect(seriesUpdateMock).toHaveBeenCalledWith({
      where: { id: "series-1" },
      data: expect.objectContaining({
        homeTeamName: "Panthers",
        awayTeamName: "Oilers",
      }),
    })
  })

  it("sets a schedule-season series winner when one team reaches four completed wins", async () => {
    const liveScores = await import("@/lib/sports-live-scores-service")
    vi.spyOn(liveScores, "fetchRollingInsightsScheduleSeasonWithDiagnostics").mockResolvedValue(scheduleResult("NBA", 2026, [
      scheduleRow("NBA", "Postseason", "First Round", 1, "Boston Celtics", "Miami Heat", "completed", "2026-04-20T00:00:00.000Z", 100, 90),
      scheduleRow("NBA", "Postseason", "First Round", 1, "Miami Heat", "Boston Celtics", "completed", "2026-04-22T00:00:00.000Z", 90, 110),
      scheduleRow("NBA", "Postseason", "First Round", 1, "Boston Celtics", "Miami Heat", "completed", "2026-04-24T00:00:00.000Z", 101, 99),
      scheduleRow("NBA", "Postseason", "First Round", 1, "Miami Heat", "Boston Celtics", "completed", "2026-04-26T00:00:00.000Z", 91, 99),
    ] as any))
    challengeFindUniqueMock.mockResolvedValue({
      ...baseChallenge,
      series: [{ ...baseChallenge.series[0], homeTeamName: "E1", awayTeamName: "E8" }],
    })

    const { syncPlayoffChallengeSeries } = await import("@/lib/playoffs/playoffSeriesSyncService")
    const result = await syncPlayoffChallengeSeries({ challengeId: "challenge-1" })

    expect(result.winnersUpdated).toBe(1)
    expect(seriesUpdateMock).toHaveBeenCalledWith({
      where: { id: "series-1" },
      data: expect.objectContaining({
        status: "final",
        winnerTeamName: "Boston Celtics",
      }),
    })
  })

  it("falls back to live and ESPN providers when schedule-season is empty", async () => {
    const liveScores = await import("@/lib/sports-live-scores-service")
    vi.spyOn(liveScores, "fetchRollingInsightsScheduleSeasonWithDiagnostics").mockResolvedValue(scheduleResult("NBA", 2026, []))
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

    const { fetchLivePlayoffSeriesGames } = await import("@/lib/playoffs/playoffSeriesSyncService")
    const result = await fetchLivePlayoffSeriesGames({ sport: "nba", seasonYear: 2026 })

    expect(result.source).toBe("rolling_insights")
    expect(result.attemptedProviders).toEqual(["rolling_insights_schedule_season", "rolling_insights"])
    expect(result.diagnostics.providerSeasonAttempts.length).toBeGreaterThanOrEqual(2)
    expect(result.warnings).toContain("No NBA games returned from Rolling Insights schedule-season or Rolling Insights for season 2026.")
  })
})

function scheduleRow(
  sport: "NBA" | "NHL",
  seasonType: string,
  eventName: string,
  round: number,
  homeTeam: string,
  awayTeam: string,
  status: string,
  gameTime: string,
  homeScore?: number,
  awayScore?: number,
) {
  return {
    sport,
    gameId: `${homeTeam}-${awayTeam}-${gameTime}`,
    season: 2026,
    seasonType,
    eventName,
    round,
    homeTeam,
    awayTeam,
    homeTeamId: `${homeTeam}-id`,
    awayTeamId: `${awayTeam}-id`,
    homeScore: homeScore ?? null,
    awayScore: awayScore ?? null,
    startsAt: gameTime,
    status,
    completed: status === "final" || status === "completed",
  }
}

function scheduleResult(sport: "NBA" | "NHL", seasonYear: number, rows: any[]) {
  return {
    rows,
    diagnostics: {
      httpStatus: 200,
      contentType: "application/json",
      topLevelKeys: ["data"],
      dataKeys: [sport],
      firstItemKeys: rows[0] ? Object.keys(rows[0]) : [],
      firstItemSafeFields: {
        season_type: rows[0]?.seasonType,
        season: rows[0]?.season,
        status: rows[0]?.status,
        event_name: rows[0]?.eventName,
        round: rows[0]?.round,
        home_team: rows[0]?.homeTeam,
        away_team: rows[0]?.awayTeam,
      },
      textPreview: null,
      rollingInsightsTokenPresent: true,
      tokenEnvNameUsed: "ROLLING_INSIGHTS_RSC_TOKEN",
      baseUrlUsed: "https://rest.datafeeds.rolling-insights.com/api/v1",
      endpointKind: "schedule-season",
      sanitizedUrl: `https://rest.datafeeds.rolling-insights.com/api/v1/schedule-season/${seasonYear}/${sport}?RSC_token=<redacted>`,
    },
  }
}

function repeatSeriesGames(eventName: string, homeTeam: string, awayTeam: string, count: number) {
  return Array.from({ length: count }).map((_, index) =>
    scheduleRow("NBA", "Postseason", eventName, null as any, homeTeam, awayTeam, "scheduled", `2026-04-${String(index + 10).padStart(2, "0")}T00:00:00.000Z`)
  )
}

function firstRoundSeries(id: string, seriesNumber: number, conference: "east" | "west", homeTeamName: string, awayTeamName: string) {
  return {
    ...baseChallenge.series[0],
    id,
    roundIndex: 1,
    seriesNumber,
    conference,
    homeTeamName,
    awayTeamName,
    sourceSeriesHome: null,
    sourceSeriesAway: null,
  }
}
