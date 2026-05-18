import { beforeEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"

const requireUserMock = vi.hoisted(() => vi.fn())
const accessMock = vi.hoisted(() => vi.fn())
const simulateMatchMock = vi.hoisted(() => vi.fn())
const loadFixturesMock = vi.hoisted(() => vi.fn())
const syncLiveMock = vi.hoisted(() => vi.fn())

vi.mock("@/app/api/brackets/world-cup/_utils", () => ({
  requireWorldCupApiUser: requireUserMock,
  assertWorldCupSimulationAccess: accessMock,
  assertWorldCupManager: accessMock,
  worldCupChallengeParamsSchema: z.object({ challengeId: z.string().min(1) }),
  worldCupProviderSyncErrorResponse: (error: unknown, context: { provider?: string | null; seasonYear?: number | null }) => {
    const message = error instanceof Error ? error.message : String(error)
    const isProviderError = /api-football|apisports|sportsdata|fetch|network|rate limit|timeout/i.test(message)
    return Response.json(
      {
        ok: false,
        error: isProviderError ? "provider_fetch_failed" : "sync_service_failed",
        message: isProviderError
          ? "World Cup data provider request failed. Check provider status, credentials, and rate limits."
          : "World Cup sync failed. Please retry or check server logs.",
        provider: context.provider ?? null,
        seasonYear: context.seasonYear ?? null,
      },
      { status: isProviderError ? 502 : 500 }
    )
  },
}))

vi.mock("@/lib/world-cup/worldCupSimulationService", () => ({
  simulateWorldCupMatchResult: simulateMatchMock,
  loadWorldCupTestFixtures: loadFixturesMock,
}))

vi.mock("@/lib/world-cup/worldCupDataSyncService", () => ({
  syncWorldCupLiveScores: syncLiveMock,
}))

describe("world cup simulation admin routes", () => {
  beforeEach(() => {
    requireUserMock.mockReset()
    accessMock.mockReset()
    simulateMatchMock.mockReset()
    syncLiveMock.mockReset()

    requireUserMock.mockResolvedValue({ ok: true, user: { id: "owner-1", email: "owner@example.com" } })
    accessMock.mockResolvedValue({ ok: true, challenge: { id: "c1" }, isAdmin: false })
    simulateMatchMock.mockResolvedValue({ challengeId: "c1", updatedMatch: { id: "m1" } })
    syncLiveMock.mockResolvedValue({
      updated: 1,
      skipped: 0,
      finalMatches: 1,
      recalculated: true,
      warnings: [],
    })
    loadFixturesMock.mockResolvedValue({
      success: true,
      teamsCreated: 32,
      teamsUpdated: 0,
      matchesUpdated: 16,
      pickableMatchesAfter: 16,
      totalMatchesAfter: 31,
      unresolvedMatchesAfter: 15,
      warnings: [],
    })
  })

  it("enforces owner/admin simulation access", async () => {
    accessMock.mockResolvedValueOnce({
      ok: false,
      response: new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "content-type": "application/json" },
      }),
    })

    const { POST } = await import("@/app/api/brackets/world-cup/[challengeId]/admin/simulate-match/route")
    const res = await POST(
      new Request("http://localhost/api/brackets/world-cup/c1/admin/simulate-match", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          matchId: "m1",
          confirmSimulation: true,
        }),
      }),
      { params: { challengeId: "c1" } }
    )

    expect(res.status).toBe(403)
    expect(simulateMatchMock).not.toHaveBeenCalled()
  })

  it("sync-live recalculates the leaderboard after score updates", async () => {
    const { POST } = await import("@/app/api/brackets/world-cup/[challengeId]/admin/sync-live/route")
    const res = await POST(
      new Request("http://localhost/api/brackets/world-cup/c1/admin/sync-live", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider: "mock", useLegacySingleProvider: true }),
      }),
      { params: { challengeId: "c1" } }
    )

    expect(res.status).toBe(200)
    expect(syncLiveMock).toHaveBeenCalledWith(
      expect.objectContaining({
        challengeId: "c1",
        provider: "mock",
        recalculate: true,
      })
    )
    await expect(res.json()).resolves.toMatchObject({
      ok: true,
      mode: "legacy_single_provider",
      updated: 1,
      finalMatches: 1,
      recalculated: true,
    })
  })

  it("returns sanitized provider errors when live sync fails", async () => {
    syncLiveMock.mockRejectedValueOnce(
      new Error("API-Football fixtures failed: Bearer super-secret-token key=provider-secret")
    )

    const { POST } = await import("@/app/api/brackets/world-cup/[challengeId]/admin/sync-live/route")
    const res = await POST(
      new Request("http://localhost/api/brackets/world-cup/c1/admin/sync-live", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider: "apifootball", dryRun: true }),
      }),
      { params: { challengeId: "c1" } }
    )

    expect(res.status).toBe(502)
    const body = await res.json()
    expect(body).toMatchObject({
      ok: false,
      error: "provider_fetch_failed",
      message: "World Cup data provider request failed. Check provider status, credentials, and rate limits.",
      provider: "apifootball",
      seasonYear: 2026,
    })
    expect(JSON.stringify(body)).not.toContain("super-secret-token")
    expect(JSON.stringify(body)).not.toContain("provider-secret")
  })

  it("requires confirmSimulation in request body", async () => {
    const { POST } = await import("@/app/api/brackets/world-cup/[challengeId]/admin/simulate-match/route")
    const res = await POST(
      new Request("http://localhost/api/brackets/world-cup/c1/admin/simulate-match", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          matchId: "m1",
        }),
      }),
      { params: { challengeId: "c1" } }
    )

    expect(res.status).toBe(400)
    expect(accessMock).not.toHaveBeenCalled()
    expect(simulateMatchMock).not.toHaveBeenCalled()
  })

  it("blocks unsafe production/public simulation attempts", async () => {
    accessMock.mockResolvedValueOnce({
      ok: false,
      response: new Response(
        JSON.stringify({ error: "Simulation is blocked for public production leagues unless test mode is enabled" }),
        {
          status: 403,
          headers: { "content-type": "application/json" },
        }
      ),
    })

    const { POST } = await import("@/app/api/brackets/world-cup/[challengeId]/admin/simulate-match/route")
    const res = await POST(
      new Request("http://localhost/api/brackets/world-cup/c1/admin/simulate-match", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          matchId: "m1",
          confirmSimulation: true,
        }),
      }),
      { params: { challengeId: "c1" } }
    )

    expect(res.status).toBe(403)
    expect(simulateMatchMock).not.toHaveBeenCalled()
  })

  it("requires confirmTestFixtures for load-test-fixtures route", async () => {
    const { POST } = await import("@/app/api/brackets/world-cup/[challengeId]/admin/load-test-fixtures/route")
    const res = await POST(
      new Request("http://localhost/api/brackets/world-cup/c1/admin/load-test-fixtures", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dryRun: false }),
      }),
      { params: { challengeId: "c1" } }
    )

    expect(res.status).toBe(400)
    expect(loadFixturesMock).not.toHaveBeenCalled()
  })

  it("requires owner/admin for load-test-fixtures route", async () => {
    accessMock.mockResolvedValueOnce({
      ok: false,
      response: new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "content-type": "application/json" },
      }),
    })

    const { POST } = await import("@/app/api/brackets/world-cup/[challengeId]/admin/load-test-fixtures/route")
    const res = await POST(
      new Request("http://localhost/api/brackets/world-cup/c1/admin/load-test-fixtures", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirmTestFixtures: true }),
      }),
      { params: { challengeId: "c1" } }
    )

    expect(res.status).toBe(403)
    expect(loadFixturesMock).not.toHaveBeenCalled()
  })
})
