/**
 * Phase 3.6 — Manager Intelligence live.ts integration tests.
 *
 * Following Mission Control's and League Health's established pattern.
 * Manager Intelligence's `getManagerDirectory()` cannot honestly complete at
 * all today (see live.ts's own doc comment and
 * MANAGER_INTELLIGENCE_LIVE_INTEGRATION_REPORT.md for the field-by-field
 * justification: archetype/engagementTrend/reliabilityScore/tenureSeasons
 * have no real Decision OS analog). These tests prove the real pipeline
 * still runs correctly (league resolution, the batch /league/managers call,
 * batched name resolution) even though the observable result is always the
 * honest degraded error on a successful call.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const getServerSessionMock = vi.hoisted(() => vi.fn())
vi.mock("next-auth", () => ({ getServerSession: getServerSessionMock }))
vi.mock("@/lib/auth", () => ({ authOptions: {} }))

const prismaMock = vi.hoisted(() => ({
  roster: { findMany: vi.fn() },
  appUser: { findMany: vi.fn() },
}))
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))

const callDecisionOSMock = vi.hoisted(() => vi.fn())
vi.mock("@/lib/commissioner-os/adapter/transport", () => ({ callDecisionOS: callDecisionOSMock }))

const isLiveReadyMock = vi.hoisted(() => vi.fn())
vi.mock("@/lib/commissioner-os/liveReadiness", () => ({ isLiveReady: isLiveReadyMock }))

import { liveManagerIntelligenceClient } from "@/lib/commissioner-os/managers/decision-os-client/live"

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.clearAllMocks()
})

function withActiveLeague(leagueId = "lg-1") {
  getServerSessionMock.mockResolvedValue({ user: { id: "user-1" } })
  prismaMock.roster.findMany.mockResolvedValue([{ league: { id: leagueId, status: "active" } }])
}

describe("Manager Intelligence live.ts — isLiveReady gating", () => {
  it("not-yet-integrated placeholder when isLiveReady is false, without touching session/prisma/transport", async () => {
    isLiveReadyMock.mockResolvedValue(false)
    const result = await liveManagerIntelligenceClient.getManagerDirectory()
    expect(result.data).toBeNull()
    expect(result.error).toMatchObject({ category: "upstream_unavailable", moduleId: "managers", retryable: false })
    expect(result.source).toBe("live")
    expect(getServerSessionMock).not.toHaveBeenCalled()
    expect(callDecisionOSMock).not.toHaveBeenCalled()
  })
})

describe("Manager Intelligence live.ts — active-league resolution", () => {
  beforeEach(() => {
    isLiveReadyMock.mockResolvedValue(true)
  })

  it("resolves no active league (no session) → honest placeholder, never calls the transport", async () => {
    getServerSessionMock.mockResolvedValue(null)
    const result = await liveManagerIntelligenceClient.getManagerDirectory()
    expect(result.error).toMatchObject({ category: "upstream_unavailable", moduleId: "managers" })
    expect(callDecisionOSMock).not.toHaveBeenCalled()
  })

  it("resolves no active league (session present, zero non-archived rosters) → honest placeholder", async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: "user-1" } })
    prismaMock.roster.findMany.mockResolvedValue([{ league: { id: "lg-archived", status: "ARCHIVED" } }])
    const result = await liveManagerIntelligenceClient.getManagerDirectory()
    expect(result.error).toMatchObject({ category: "upstream_unavailable", moduleId: "managers" })
    expect(callDecisionOSMock).not.toHaveBeenCalled()
  })

  it("resolves the most recent non-archived league and calls the real /league/managers route with it, correctly encoded", async () => {
    withActiveLeague("lg live/one")
    callDecisionOSMock.mockResolvedValue({ data: { data: [] }, error: null })
    await liveManagerIntelligenceClient.getManagerDirectory()
    expect(prismaMock.roster.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { platformUserId: "user-1" } }))
    expect(callDecisionOSMock).toHaveBeenCalledWith("managers", `/api/v1/intelligence/league/managers?leagueId=${encodeURIComponent("lg live/one")}`)
  })
})

describe("Manager Intelligence live.ts — the real pipeline runs, but always degrades honestly on success", () => {
  beforeEach(() => {
    isLiveReadyMock.mockResolvedValue(true)
    withActiveLeague()
  })

  it("a successful /league/managers call still returns the specific 'DNA classification unavailable' error — never a fabricated directory", async () => {
    callDecisionOSMock.mockResolvedValue({ data: { data: [{ managerId: "u-1" }, { managerId: "u-2" }] }, error: null })
    prismaMock.appUser.findMany.mockResolvedValue([
      { id: "u-1", displayName: "Priya N.", username: "priya" },
      { id: "u-2", displayName: null, username: "sam_r" },
    ])

    const result = await liveManagerIntelligenceClient.getManagerDirectory()

    expect(result.data).toBeNull()
    expect(result.error?.category).toBe("upstream_unavailable")
    expect(result.error?.message).toMatch(/archetype/i)
  })

  it("really resolves manager display names via a single batched appUser query, proving the pipeline (even though the result is discarded)", async () => {
    callDecisionOSMock.mockResolvedValue({ data: { data: [{ managerId: "u-1" }, { managerId: "u-2" }] }, error: null })
    prismaMock.appUser.findMany.mockResolvedValue([])

    await liveManagerIntelligenceClient.getManagerDirectory()

    expect(prismaMock.appUser.findMany).toHaveBeenCalledTimes(1)
    expect(prismaMock.appUser.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: { in: ["u-1", "u-2"] } } }))
  })

  it("an empty manager list still degrades honestly — no appUser call needed, no fabricated entries", async () => {
    callDecisionOSMock.mockResolvedValue({ data: { data: [] }, error: null })
    const result = await liveManagerIntelligenceClient.getManagerDirectory()
    expect(result.data).toBeNull()
    expect(result.error?.category).toBe("upstream_unavailable")
    expect(prismaMock.appUser.findMany).not.toHaveBeenCalled()
  })

  it("a real transport failure is passed straight through, not masked by the capability-gap error", async () => {
    const transportError = { category: "unauthorized" as const, message: "Unknown API key.", moduleId: "managers" as const, retryable: false, timestamp: new Date().toISOString() }
    callDecisionOSMock.mockResolvedValue({ data: null, error: transportError })
    const result = await liveManagerIntelligenceClient.getManagerDirectory()
    expect(result.error).toEqual(transportError)
  })

  it("every result carries source='live' and a valid ISO timestamp", async () => {
    callDecisionOSMock.mockResolvedValue({ data: { data: [] }, error: null })
    const result = await liveManagerIntelligenceClient.getManagerDirectory()
    expect(result.source).toBe("live")
    expect(Number.isNaN(Date.parse(result.timestamp))).toBe(false)
  })
})
