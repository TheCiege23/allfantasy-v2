import { beforeEach, describe, expect, it, vi } from "vitest"

const prismaMock = vi.hoisted(() => ({
  apiCallLogRecord: {
    groupBy: vi.fn(),
  },
  apiRateLimitRecord: {
    findMany: vi.fn(),
  },
  providerSyncState: {
    findMany: vi.fn(),
  },
  sportsTeam: {
    groupBy: vi.fn(),
  },
  sportsPlayer: {
    groupBy: vi.fn(),
  },
  sportsGame: {
    groupBy: vi.fn(),
  },
  sportsInjury: {
    groupBy: vi.fn(),
  },
  sportsNews: {
    groupBy: vi.fn(),
  },
  sportsDataCache: {
    count: vi.fn(),
  },
  worldCupTeam: {
    count: vi.fn(),
  },
  worldCupOfficialFixture: {
    count: vi.fn(),
  },
  worldCupOfficialGroupStanding: {
    count: vi.fn(),
  },
  worldCupSyncLog: {
    count: vi.fn(),
  },
}))

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}))

vi.mock("@/lib/world-cup/live-providers/worldCupLiveProviderRegistry", () => ({
  getWorldCupLiveProviderChain: vi.fn(() => ["api_sports", "thesportsdb", "manual"]),
}))

const ENV_KEYS = [
  "WORLD_CUP_DATA_PROVIDER",
  "API_SPORTS_KEY",
  "API_FOOTBALL_KEY",
  "APISPORTS_FOOTBALL_KEY",
  "RAPIDAPI_KEY",
  "API_FOOTBALL_WORLD_CUP_LEAGUE_ID",
  "WORLD_CUP_CRON_SECRET",
  "SPORTSDATA_API_KEY",
  "ROLLING_INSIGHTS_API_KEY",
  "ROLLING_INSIGHTS_CLIENT_ID",
  "ROLLING_INSIGHTS_CLIENT_SECRET",
  "CLEARSPORTS_API_KEY",
  "CLEARSPORTS_API_BASE",
  "THESPORTSDB_API_KEY",
  "CFBD_API_KEY",
  "OPENAI_API_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "KLIPY_API_KEY",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_VERIFY_SERVICE_SID",
]

function resetEnv() {
  for (const key of ENV_KEYS) {
    delete process.env[key]
  }
}

function primeEmptyDb() {
  prismaMock.apiCallLogRecord.groupBy.mockResolvedValue([])
  prismaMock.apiRateLimitRecord.findMany.mockResolvedValue([])
  prismaMock.providerSyncState.findMany.mockResolvedValue([])
  prismaMock.sportsTeam.groupBy.mockResolvedValue([])
  prismaMock.sportsPlayer.groupBy.mockResolvedValue([])
  prismaMock.sportsGame.groupBy.mockResolvedValue([])
  prismaMock.sportsInjury.groupBy.mockResolvedValue([])
  prismaMock.sportsNews.groupBy.mockResolvedValue([])
  prismaMock.sportsDataCache.count.mockResolvedValue(0)
  prismaMock.worldCupTeam.count.mockResolvedValue(0)
  prismaMock.worldCupOfficialFixture.count.mockResolvedValue(0)
  prismaMock.worldCupOfficialGroupStanding.count.mockResolvedValue(0)
  prismaMock.worldCupSyncLog.count.mockResolvedValue(0)
}

describe("AdminProviderHealthService", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    resetEnv()
    primeEmptyDb()
  })

  it("summarizes provider readiness without calling external APIs", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
    const { getAdminProviderHealthRows } = await import("@/lib/admin-dashboard/AdminProviderHealthService")

    const rows = await getAdminProviderHealthRows()

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(rows.find((row) => row.id === "api_football_world_cup")).toMatchObject({
      status: "missing_env",
      configured: false,
    })
    expect(rows.find((row) => row.id === "sportsdata_world_cup")).toMatchObject({
      status: "scaffold_only",
      configured: false,
    })
    expect(rows.find((row) => row.id === "sleeper")).toMatchObject({
      status: "public_fallback",
      configured: true,
    })
    fetchSpy.mockRestore()
  })

  it("reports configured World Cup provider, request telemetry, rate window, and sync errors", async () => {
    process.env.WORLD_CUP_DATA_PROVIDER = "apifootball"
    process.env.API_SPORTS_KEY = "test-key"
    process.env.API_FOOTBALL_WORLD_CUP_LEAGUE_ID = "1"
    process.env.WORLD_CUP_CRON_SECRET = "cron-secret"

    const syncAt = new Date("2026-06-04T12:00:00.000Z")
    prismaMock.apiCallLogRecord.groupBy.mockResolvedValue([
      {
        provider: "api_sports",
        _count: { _all: 3 },
        _avg: { latencyMs: 123.4 },
      },
    ])
    prismaMock.apiRateLimitRecord.findMany.mockResolvedValue([
      {
        provider: "api_sports",
        callsMade: 3,
        callsLimit: 7500,
        windowEnd: syncAt,
      },
    ])
    prismaMock.providerSyncState.findMany.mockResolvedValue([
      {
        provider: "api_sports",
        lastCompletedAt: syncAt,
        lastSuccessAt: syncAt,
        lastErrorAt: null,
        lastError: null,
        recordsImported: 12,
        recordsUpdated: 4,
        recordsSkipped: 0,
        updatedAt: syncAt,
      },
    ])
    prismaMock.worldCupTeam.count.mockResolvedValue(48)
    prismaMock.worldCupOfficialFixture.count.mockResolvedValue(104)
    prismaMock.worldCupOfficialGroupStanding.count.mockResolvedValue(48)

    const { getAdminProviderHealthRows } = await import("@/lib/admin-dashboard/AdminProviderHealthService")
    const rows = await getAdminProviderHealthRows()
    const worldCup = rows.find((row) => row.id === "api_football_world_cup")

    expect(worldCup).toMatchObject({
      status: "configured",
      configured: true,
      requestCount24h: 3,
      avgLatencyMs24h: 123,
      rateLimit: "3/7500 calls this window",
      importedRows: 200,
      lastSyncAt: syncAt.toISOString(),
    })
  })
})

