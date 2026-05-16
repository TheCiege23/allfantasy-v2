import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const serviceMocks = vi.hoisted(() => ({
  syncWorldCupTeams: vi.fn(),
  syncWorldCupFixtures: vi.fn(),
  syncWorldCupLiveScores: vi.fn(),
  syncWorldCupProviderGroupStandings: vi.fn(),
  recalculateWorldCupChallenge: vi.fn(),
  prisma: {
    worldCupBracketChallenge: {
      findMany: vi.fn(),
    },
  },
}))

vi.mock("server-only", () => ({}))
vi.mock("@/lib/prisma", () => ({ prisma: serviceMocks.prisma }))
vi.mock("@/lib/world-cup", () => ({
  syncWorldCupTeams: serviceMocks.syncWorldCupTeams,
  syncWorldCupFixtures: serviceMocks.syncWorldCupFixtures,
  syncWorldCupLiveScores: serviceMocks.syncWorldCupLiveScores,
  syncWorldCupProviderGroupStandings: serviceMocks.syncWorldCupProviderGroupStandings,
  recalculateWorldCupChallenge: serviceMocks.recalculateWorldCupChallenge,
}))

function req(url: string, secret?: string) {
  return new NextRequest(url, {
    headers: secret ? { authorization: `Bearer ${secret}` } : {},
  })
}

describe("World Cup cron sync route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv("WORLD_CUP_CRON_SECRET", "cron-secret")
    vi.stubEnv("API_SPORTS_KEY", "api-key")
    serviceMocks.prisma.worldCupBracketChallenge.findMany.mockResolvedValue([{ id: "c1" }])
    serviceMocks.syncWorldCupLiveScores.mockResolvedValue({
      updated: 1,
      skipped: 0,
      finalMatches: 0,
      warnings: [],
      recalculated: true,
    })
    serviceMocks.syncWorldCupTeams.mockResolvedValue({ created: 0, updated: 0, skipped: 0, warnings: [] })
  })

  it("rejects Vercel GET cron calls without a secret", async () => {
    const { GET } = await import("@/app/api/brackets/world-cup/cron/sync/route")

    const response = await GET(req("https://www.allfantasy.ai/api/brackets/world-cup/cron/sync?job=live"))

    expect(response.status).toBe(401)
  })

  it("runs GET live sync with cron secret and query params", async () => {
    const { GET } = await import("@/app/api/brackets/world-cup/cron/sync/route")

    const response = await GET(req("https://www.allfantasy.ai/api/brackets/world-cup/cron/sync?job=live&provider=apifootball&recalculate=true", "cron-secret"))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(serviceMocks.syncWorldCupLiveScores).toHaveBeenCalledWith({
      challengeId: "c1",
      provider: "apifootball",
      seasonYear: 2026,
      dryRun: false,
      recalculate: true,
    })
  })

  it("supports GET teams sync for Vercel cron", async () => {
    const { GET } = await import("@/app/api/brackets/world-cup/cron/sync/route")

    const response = await GET(req("https://www.allfantasy.ai/api/brackets/world-cup/cron/sync?job=teams&provider=apifootball", "cron-secret"))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.result.teams).toEqual({ created: 0, updated: 0, skipped: 0, warnings: [] })
    expect(serviceMocks.prisma.worldCupBracketChallenge.findMany).not.toHaveBeenCalled()
    expect(serviceMocks.syncWorldCupTeams).toHaveBeenCalledWith({
      provider: "apifootball",
      seasonYear: 2026,
      dryRun: false,
    })
  })

  it("returns clear JSON when API-Football key is missing", async () => {
    vi.stubEnv("API_SPORTS_KEY", "")
    vi.stubEnv("API_FOOTBALL_KEY", "")
    vi.stubEnv("APISPORTS_FOOTBALL_KEY", "")
    vi.stubEnv("RAPIDAPI_KEY", "")
    const { GET } = await import("@/app/api/brackets/world-cup/cron/sync/route")

    const response = await GET(req("https://www.allfantasy.ai/api/brackets/world-cup/cron/sync?job=teams&provider=apifootball", "cron-secret"))
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body).toMatchObject({
      ok: false,
      error: "missing_provider_key",
      job: "teams",
      provider: "apifootball",
      seasonYear: 2026,
    })
    expect(JSON.stringify(body)).not.toContain("api-key")
    expect(serviceMocks.syncWorldCupTeams).not.toHaveBeenCalled()
  })

  it("returns clear JSON when provider fetch fails", async () => {
    serviceMocks.syncWorldCupTeams.mockRejectedValue(new Error("API-Football teams failed: 403 Forbidden"))
    const { GET } = await import("@/app/api/brackets/world-cup/cron/sync/route")

    const response = await GET(req("https://www.allfantasy.ai/api/brackets/world-cup/cron/sync?job=teams&provider=apifootball", "cron-secret"))
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body).toMatchObject({
      ok: false,
      error: "provider_fetch_failed",
      job: "teams",
      provider: "apifootball",
    })
    expect(body.message).toContain("API-Football teams failed")
  })

  it("returns clear JSON when sync/database work fails", async () => {
    serviceMocks.syncWorldCupTeams.mockRejectedValue(new Error("PrismaClientKnownRequestError: unique constraint failed"))
    const { GET } = await import("@/app/api/brackets/world-cup/cron/sync/route")

    const response = await GET(req("https://www.allfantasy.ai/api/brackets/world-cup/cron/sync?job=teams&provider=apifootball", "cron-secret"))
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body).toMatchObject({
      ok: false,
      error: "database_write_failed",
      job: "teams",
      provider: "apifootball",
    })
  })
})
