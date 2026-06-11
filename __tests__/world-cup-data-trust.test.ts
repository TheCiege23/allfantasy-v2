import { beforeEach, describe, expect, it, vi } from "vitest"

// ── Prisma mocks ──────────────────────────────────────────────────────────────

const challengeFindUnique = vi.hoisted(() => vi.fn())
const syncLogFindFirst = vi.hoisted(() => vi.fn())
const matchCountMock = vi.hoisted(() => vi.fn())
const matchAggregateMock = vi.hoisted(() => vi.fn())
const fixtureCountMock = vi.hoisted(() => vi.fn())
const teamCountMock = vi.hoisted(() => vi.fn())
const standingsAggregateMock = vi.hoisted(() => vi.fn())

vi.mock("server-only", () => ({}))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    worldCupBracketChallenge: { findUnique: challengeFindUnique },
    worldCupSyncLog: { findFirst: syncLogFindFirst },
    worldCupBracketMatch: { count: matchCountMock, aggregate: matchAggregateMock },
    worldCupOfficialFixture: { count: fixtureCountMock },
    worldCupTeam: { count: teamCountMock },
    worldCupOfficialGroupStanding: { aggregate: standingsAggregateMock },
  },
}))

// Helper to set default mock values for a "baseline" scenario
// Order matches Promise.all order in getWorldCupDataTrustReport:
// [syncLog, liveCount, completedCount, upcomingCount, scoreAgg, fixturesTotal,
//  fixturesMissingKickoff, fixturesMissingStatus, teamsTotal, teamsMissingFlag,
//  teamsMissingLogo, standingsAgg]
function setupMocks({
  syncLog = null as { status: string; source: string; finishedAt: Date | null; createdAt: Date } | null,
  liveMatchCount = 0,
  completedMatchCount = 0,
  upcomingMatchCount = 48,
  lastScoreSyncedAt = null as Date | null,
  fixturesCount = 64,
  fixturesMissingKickoff = 0,
  fixturesMissingStatus = 0,
  teamsCount = 32,
  teamsMissingFlag = 0,
  teamsMissingLogo = 0,
  standingsCount = 128,
  standingsUpdatedAt = null as Date | null,
} = {}) {
  challengeFindUnique.mockResolvedValue({ seasonYear: 2026 })
  syncLogFindFirst.mockResolvedValue(syncLog)
  matchCountMock
    .mockResolvedValueOnce(liveMatchCount)
    .mockResolvedValueOnce(completedMatchCount)
    .mockResolvedValueOnce(upcomingMatchCount)
  matchAggregateMock.mockResolvedValue({
    _max: { lastScoreSyncedAt },
  })
  fixtureCountMock
    .mockResolvedValueOnce(fixturesCount)
    .mockResolvedValueOnce(fixturesMissingKickoff)
    .mockResolvedValueOnce(fixturesMissingStatus)
  teamCountMock
    .mockResolvedValueOnce(teamsCount)
    .mockResolvedValueOnce(teamsMissingFlag)
    .mockResolvedValueOnce(teamsMissingLogo)
  standingsAggregateMock.mockResolvedValue({
    _count: { id: standingsCount },
    _max: { updatedAt: standingsUpdatedAt },
  })
}

describe("WorldCupDataTrustService", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("D1: returns live tier when live matches exist and score sync is fresh", async () => {
    const freshSyncedAt = new Date(Date.now() - 60_000) // 1 min ago
    setupMocks({
      syncLog: {
        status: "success",
        source: "cron",
        finishedAt: new Date(Date.now() - 2 * 60 * 1000),
        createdAt: new Date(),
      },
      liveMatchCount: 3,
      lastScoreSyncedAt: freshSyncedAt,
    })

    const { getWorldCupDataTrustReport } = await import(
      "@/lib/world-cup/worldCupDataTrustService"
    )
    const report = await getWorldCupDataTrustReport("challenge-1")

    expect(report.dataFreshness).toBe("live")
    expect(report.userFacingLabel).toBe("Live scores active")
    expect(report.hasLiveData).toBe(true)
    expect(report.liveMatchCount).toBe(3)
  })

  it("D2: returns cached tier when sync is recent and no live matches", async () => {
    setupMocks({
      syncLog: {
        status: "success",
        source: "cron",
        finishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2h ago
        createdAt: new Date(),
      },
      liveMatchCount: 0,
    })

    const { getWorldCupDataTrustReport } = await import(
      "@/lib/world-cup/worldCupDataTrustService"
    )
    const report = await getWorldCupDataTrustReport("challenge-1")

    expect(report.dataFreshness).toBe("cached")
    expect(report.userFacingLabel).toBe("Updated within 24 hours")
    expect(report.hasLiveData).toBe(false)
  })

  it("D3: returns schedule_only when fixtures exist but sync is stale", async () => {
    setupMocks({
      syncLog: {
        status: "success",
        source: "admin",
        finishedAt: new Date(Date.now() - 30 * 60 * 60 * 1000), // 30h ago — stale
        createdAt: new Date(),
      },
      liveMatchCount: 0,
      fixturesCount: 48,
    })

    const { getWorldCupDataTrustReport } = await import(
      "@/lib/world-cup/worldCupDataTrustService"
    )
    const report = await getWorldCupDataTrustReport("challenge-1")

    expect(report.dataFreshness).toBe("schedule_only")
    expect(report.userFacingLabel).toContain("Schedule only")
    expect(report.fixturesCount).toBe(48)
  })

  it("D4: returns pool_only when no fixtures but teams exist", async () => {
    setupMocks({
      syncLog: null,
      fixturesCount: 0,
      teamsCount: 32,
    })

    const { getWorldCupDataTrustReport } = await import(
      "@/lib/world-cup/worldCupDataTrustService"
    )
    const report = await getWorldCupDataTrustReport("challenge-1")

    expect(report.dataFreshness).toBe("pool_only")
    expect(report.userFacingLabel).toContain("Pool data only")
    expect(report.syncLogStatus).toBeNull()
  })

  it("D5: returns none when no fixtures and no teams", async () => {
    setupMocks({ syncLog: null, fixturesCount: 0, teamsCount: 0 })

    const { getWorldCupDataTrustReport } = await import(
      "@/lib/world-cup/worldCupDataTrustService"
    )
    const report = await getWorldCupDataTrustReport("challenge-1")

    expect(report.dataFreshness).toBe("none")
    expect(report.userFacingLabel).toBe("No data loaded")
    expect(report.fixturesCount).toBe(0)
    expect(report.teamsCount).toBe(0)
  })

  it("D6: reports team completeness gaps correctly", async () => {
    setupMocks({
      syncLog: { status: "success", source: "cron", finishedAt: new Date(), createdAt: new Date() },
      teamsCount: 32,
      teamsMissingFlag: 4,
      teamsMissingLogo: 2,
    })

    const { getWorldCupDataTrustReport } = await import(
      "@/lib/world-cup/worldCupDataTrustService"
    )
    const report = await getWorldCupDataTrustReport("challenge-1")

    expect(report.teamsMissingFlag).toBe(4)
    expect(report.teamsMissingLogo).toBe(2)
    expect(report.teamsCount).toBe(32)
  })

  it("D7: reports fixture completeness gaps and sync log metadata", async () => {
    const finishedAt = new Date(Date.now() - 60_000)
    setupMocks({
      syncLog: { status: "partial", source: "manual", finishedAt, createdAt: new Date() },
      fixturesCount: 64,
      fixturesMissingKickoff: 5,
      fixturesMissingStatus: 3,
      standingsCount: 96,
      standingsUpdatedAt: new Date(Date.now() - 30 * 60 * 1000),
    })

    const { getWorldCupDataTrustReport } = await import(
      "@/lib/world-cup/worldCupDataTrustService"
    )
    const report = await getWorldCupDataTrustReport("challenge-1")

    expect(report.fixturesMissingKickoff).toBe(5)
    expect(report.fixturesMissingStatus).toBe(3)
    expect(report.standingsCount).toBe(96)
    expect(report.syncLogStatus).toBe("partial")
    expect(report.lastSyncSource).toBe("manual")
    expect(report.lastFixtureSyncAt).toBe(finishedAt.toISOString())
    expect(report.lastStandingsSyncAt).not.toBeNull()
  })
})
