import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ApiFootballWorldCupFixture } from "@/lib/world-cup/apiSportsWorldCup"
import { normalizeProviderStatus } from "@/lib/world-cup/worldCupDataSyncService"
import {
  fetchWorldCupLiveMatchesFromChain,
  getWorldCupLiveProviderChain,
} from "@/lib/world-cup/live-providers/worldCupLiveProviderRegistry"
import type { WorldCupLiveProviderId, WorldCupLiveScoreAdapter } from "@/lib/world-cup/live-providers/worldCupLiveProviderTypes"
import {
  apiFootballFixtureToNormalizedLive,
  inferPeriodFromApiFootballShort,
  normalizeManualLivePayload,
  normalizedLiveMatchToProviderFixture,
} from "@/lib/world-cup/worldCupLiveScoreNormalizer"
import { syncWorldCupLiveScoresWithProviderChain } from "@/lib/world-cup/worldCupLiveScoreSyncService"
import { WORLD_CUP_BRACKET_EVENT_TYPES } from "@/lib/world-cup/worldCupBracketEvents"

const prismaMocks = vi.hoisted(() => ({
  findChallenge: vi.fn(),
  findTeam: vi.fn(),
  updateMatch: vi.fn(),
  createEvent: vi.fn(),
  recalc: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    worldCupBracketChallenge: {
      findUnique: prismaMocks.findChallenge,
    },
    worldCupBracketMatch: {
      update: prismaMocks.updateMatch,
    },
    worldCupBracketChatEvent: {
      create: prismaMocks.createEvent,
    },
    worldCupTeam: {
      findUnique: prismaMocks.findTeam,
    },
  },
}))

vi.mock("@/lib/world-cup/worldCupScoringService", () => ({
  recalculateWorldCupChallenge: prismaMocks.recalc,
}))

function baseFx(
  patch: Partial<ApiFootballWorldCupFixture> & {
    fixture?: Partial<ApiFootballWorldCupFixture["fixture"]>
    teams?: Partial<ApiFootballWorldCupFixture["teams"]>
  } = {}
): ApiFootballWorldCupFixture {
  const { fixture: fxPatch, teams: tmPatch, ...rest } = patch
  return {
    fixture: {
      id: 999001,
      date: "2026-06-15T18:00:00+00:00",
      status: {
        long: "Match Finished",
        short: "FT",
        elapsed: null,
        extra: null,
      },
      ...(fxPatch ?? {}),
    },
    league: { id: 1, season: 2026, round: "Final" },
    teams: {
      home: {
        id: 101,
        name: "France",
        logo: "https://media.api-sports.io/football/teams/101.png",
        winner: null,
      },
      away: {
        id: 202,
        name: "Brazil",
        logo: "https://media.api-sports.io/football/teams/202.png",
        winner: null,
      },
      ...(tmPatch ?? {}),
    },
    goals: { home: 2, away: 1 },
    score: {
      fulltime: { home: 2, away: 1 },
      penalty: { home: null, away: null },
    },
    ...rest,
  }
}

function mockAdapterFactory(
  map: Record<WorldCupLiveProviderId, WorldCupLiveScoreAdapter>
) {
  return () => map
}

function adapterFrom(
  id: WorldCupLiveScoreAdapter["id"],
  opts: {
    configured?: boolean
    rows?: ReturnType<typeof apiFootballFixtureToNormalizedLive>[]
    error?: Error
  }
): WorldCupLiveScoreAdapter {
  return {
    id,
    label: id,
    isConfigured: () => opts.configured ?? true,
    fetchLiveMatches: async () => {
      if (opts.error) throw opts.error
      return opts.rows ?? []
    },
  }
}

async function flushAsyncEventEmission() {
  await new Promise((resolve) => setTimeout(resolve, 0))
}

describe("World Cup live normalizer", () => {
  it("infers period labels from API-Football shorts", () => {
    expect(inferPeriodFromApiFootballShort("ET")).toBe("extra_time")
    expect(inferPeriodFromApiFootballShort("P")).toBe("penalties")
    expect(inferPeriodFromApiFootballShort("1H")).toBe("first_half")
    expect(inferPeriodFromApiFootballShort("HT")).toBe("halftime")
  })

  it("maps scheduled fixture", () => {
    const f = baseFx({
      fixture: {
        status: { long: "Not Started", short: "NS", elapsed: null, extra: null },
      },
      goals: { home: null, away: null },
      score: {
        fulltime: { home: null, away: null },
        penalty: { home: null, away: null },
      },
    })
    const n = apiFootballFixtureToNormalizedLive(f)
    expect(n.status).toBe("scheduled")
    expect(n.minute).toBeNull()
    expect(n.period).toBeNull()
  })

  it("maps live first half with minute + injury", () => {
    const f = baseFx({
      fixture: {
        status: { long: "First Half", short: "1H", elapsed: 34, extra: 2 },
      },
      goals: { home: 1, away: 0 },
      score: {
        fulltime: { home: null, away: null },
        penalty: { home: null, away: null },
      },
    })
    const n = apiFootballFixtureToNormalizedLive(f)
    expect(n.status).toBe("live")
    expect(n.minute).toBe(34)
    expect(n.injuryTime).toBe(2)
    expect(n.period).toBe("first_half")
  })

  it("maps halftime", () => {
    const f = baseFx({
      fixture: {
        status: { long: "Halftime", short: "HT", elapsed: null, extra: null },
      },
    })
    const n = apiFootballFixtureToNormalizedLive(f)
    expect(n.status).toBe("halftime")
    expect(n.period).toBe("halftime")
  })

  it("maps extra time", () => {
    const f = baseFx({
      fixture: {
        status: { long: "Extra Time", short: "ET", elapsed: 105, extra: null },
      },
    })
    const n = apiFootballFixtureToNormalizedLive(f)
    expect(n.status).toBe("live")
    expect(n.period).toBe("extra_time")
    expect(n.minute).toBe(105)
  })

  it("maps penalty shootout in progress", () => {
    const f = baseFx({
      fixture: {
        status: { long: "Penalty In Progress", short: "P", elapsed: null, extra: null },
      },
      score: {
        fulltime: { home: 1, away: 1 },
        penalty: { home: 3, away: 3 },
      },
    })
    const n = apiFootballFixtureToNormalizedLive(f)
    expect(n.status).toBe("live")
    expect(n.period).toBe("penalties")
    expect(n.penaltyHomeScore).toBe(3)
  })

  it("maps final after regulation", () => {
    const f = baseFx({
      teams: {
        home: {
          id: 101,
          name: "France",
          logo: null,
          winner: true,
        },
        away: {
          id: 202,
          name: "Brazil",
          logo: null,
          winner: false,
        },
      },
    })
    const n = apiFootballFixtureToNormalizedLive(f)
    expect(n.status).toBe("final")
    expect(n.winnerTeamId).toBe("101")
    expect(n.apiStatusShort).toBe("FT")
  })

  it("maps final after penalties using penalty scores", () => {
    const f = baseFx({
      fixture: {
        status: { long: "Finished after penalties", short: "PEN", elapsed: null, extra: null },
      },
      teams: {
        home: {
          id: 101,
          name: "France",
          logo: null,
          winner: null,
        },
        away: {
          id: 202,
          name: "Brazil",
          logo: null,
          winner: null,
        },
      },
      goals: { home: 1, away: 1 },
      score: {
        fulltime: { home: 1, away: 1 },
        penalty: { home: 5, away: 4 },
      },
    })
    const n = apiFootballFixtureToNormalizedLive(f)
    expect(n.status).toBe("final")
    expect(n.winnerTeamId).toBe("101")
    expect(n.penaltyHomeScore).toBe(5)
    expect(n.penaltyAwayScore).toBe(4)
  })

  it("normalizedLiveMatchToProviderFixture keeps ids for DB sync", () => {
    const f = baseFx()
    const n = apiFootballFixtureToNormalizedLive(f)
    const p = normalizedLiveMatchToProviderFixture(n)
    expect(p.providerId).toBe("999001")
    expect(p.homeProviderId).toBe("101")
    expect(normalizeProviderStatus(p.status ?? undefined)).toBe("final")
  })

  it("manual payload coerces loose rows", () => {
    const rows = normalizeManualLivePayload([
      {
        providerMatchId: "x1",
        strHomeTeam: "Spain",
        strAwayTeam: "Germany",
        idHomeTeam: "11",
        idAwayTeam: "22",
        intHomeScore: "2",
        intAwayScore: "1",
        apiStatusShort: "FT",
      },
    ])
    expect(rows).toHaveLength(1)
    expect(rows[0]?.homeTeamName).toBe("Spain")
    expect(rows[0]?.status).toBe("final")
  })
})

describe("getWorldCupLiveProviderChain", () => {
  it("parses WORLD_CUP_LIVE_PROVIDER_CHAIN", () => {
    const prev = process.env.WORLD_CUP_LIVE_PROVIDER_CHAIN
    process.env.WORLD_CUP_LIVE_PROVIDER_CHAIN = "manual, api_sports"
    const chain = getWorldCupLiveProviderChain()
    expect(chain[0]).toBe("manual")
    expect(chain[1]).toBe("api_sports")
    if (prev === undefined) {
      delete process.env.WORLD_CUP_LIVE_PROVIDER_CHAIN
    } else {
      process.env.WORLD_CUP_LIVE_PROVIDER_CHAIN = prev
    }
  })
})

describe("World Cup live provider chain", () => {
  it("uses first provider that returns rows", async () => {
    const ok = apiFootballFixtureToNormalizedLive(baseFx())
    const result = await fetchWorldCupLiveMatchesFromChain(
      2026,
      ["api_sports", "thesportsdb", "manual"],
      {
        adapterFactory: mockAdapterFactory({
          api_sports: adapterFrom("api_sports", { rows: [] }),
          thesportsdb: adapterFrom("thesportsdb", { rows: [ok] }),
          reality_sports: adapterFrom("reality_sports", { rows: [] }),
          clear_sports: adapterFrom("clear_sports", { rows: [] }),
          manual: adapterFrom("manual", { configured: false, rows: [] }),
        }),
      }
    )
    expect(result.winningProvider).toBe("thesportsdb")
    expect(result.matches).toHaveLength(1)
  })

  it("falls through errors to next provider", async () => {
    const manualRow = normalizeManualLivePayload([
      {
        providerMatchId: "m1",
        homeTeamName: "A",
        awayTeamName: "B",
        status: "scheduled",
      },
    ])[0]!

    const result = await fetchWorldCupLiveMatchesFromChain(2026, undefined, {
      adapterFactory: mockAdapterFactory({
        api_sports: adapterFrom("api_sports", {
          error: new Error("quota exceeded"),
        }),
        thesportsdb: adapterFrom("thesportsdb", { configured: false }),
        reality_sports: adapterFrom("reality_sports", { configured: false }),
        clear_sports: adapterFrom("clear_sports", { configured: false }),
        manual: adapterFrom("manual", { rows: [manualRow] }),
      }),
    })
    expect(result.winningProvider).toBe("manual")
    expect(result.warnings.some((w) => w.includes("quota"))).toBe(true)
  })
})

describe("syncWorldCupLiveScoresWithProviderChain", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    prismaMocks.findChallenge.mockReset()
    prismaMocks.findTeam.mockReset()
    prismaMocks.updateMatch.mockReset()
    prismaMocks.createEvent.mockReset()
    prismaMocks.recalc.mockReset()

    const homeId = "team-home"
    prismaMocks.findChallenge.mockResolvedValue({
      id: "chal",
      matches: [
        {
          id: "mid",
          apiFixtureId: 999001,
          winnerTeamId: null,
          homeTeamId: homeId,
          awayTeamId: "away",
          nextMatchId: null,
          nextMatchSlot: null,
          homeTeamLogo: null,
          awayTeamLogo: null,
        },
      ],
    })
    prismaMocks.findTeam.mockResolvedValue({ id: homeId })
    prismaMocks.updateMatch.mockResolvedValue({
      id: "mid",
      nextMatchId: null,
      nextMatchSlot: null,
      homeTeamId: homeId,
      awayTeamId: "away",
      homeTeamLogo: null,
      awayTeamLogo: null,
    })
  })

  it("applies normalized fixtures and emits with default settings when settings delegate is absent", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    const ok = apiFootballFixtureToNormalizedLive(baseFx())
    const result = await syncWorldCupLiveScoresWithProviderChain({
      challengeId: "chal",
      dryRun: false,
      recalculate: false,
      seasonYear: 2026,
      adapterFactory: mockAdapterFactory({
        api_sports: adapterFrom("api_sports", { rows: [ok] }),
        thesportsdb: adapterFrom("thesportsdb", { configured: false }),
        reality_sports: adapterFrom("reality_sports", { configured: false }),
        clear_sports: adapterFrom("clear_sports", { configured: false }),
        manual: adapterFrom("manual", { configured: false }),
      }),
    })

    expect(result.winningProvider).toBe("api_sports")
    expect(result.updated).toBeGreaterThanOrEqual(1)
    await flushAsyncEventEmission()
    expect(prismaMocks.createEvent).toHaveBeenCalledWith({
      data: expect.objectContaining({
        challengeId: "chal",
        eventType: WORLD_CUP_BRACKET_EVENT_TYPES.MATCH_FINAL,
        eventTitle: "Final",
      }),
    })
    expect(warnSpy).not.toHaveBeenCalled()
  })
})
