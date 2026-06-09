/**
 * Admin World Cup Actions route — POST /api/admin/world-cup/actions
 *
 * Tests:
 *   1. Unauthorized request returns 401
 *   2. Unknown action returns 400
 *   3. Missing action body returns 400
 *   4. sync-fixtures calls syncWorldCupFixtures and returns counts
 *   5. sync-live-scores iterates active challenges and aggregates counts
 *   6. sync-standings iterates active challenges
 *   7. recompute-scores iterates active challenges
 *   8. rebuild-grounding returns readiness counts (read-only)
 *   9. Empty active challenges returns ok:true with zero counts
 *  10. Service error returns ok:false with error field
 */
import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Mock dependencies ────────────────────────────────────────────────────────

vi.mock("@/lib/adminAuth", () => ({
  requireAdmin: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    worldCupBracketChallenge: {
      findMany: vi.fn(),
    },
  },
}))

vi.mock("@/lib/world-cup/worldCupDataSyncService", () => ({
  syncWorldCupFixtures: vi.fn(),
  syncWorldCupLiveScores: vi.fn(),
  syncWorldCupProviderGroupStandings: vi.fn(),
}))

vi.mock("@/lib/world-cup/worldCupScoringService", () => ({
  recalculateWorldCupChallenge: vi.fn(),
}))

vi.mock("@/lib/world-cup/worldCupOperationsReadiness", () => ({
  getWorldCupOperationsReadiness: vi.fn(),
}))

// ─── Import after mocks ───────────────────────────────────────────────────────

import { POST } from "@/app/api/admin/world-cup/actions/route"
import { requireAdmin } from "@/lib/adminAuth"
import { prisma } from "@/lib/prisma"
import {
  syncWorldCupFixtures,
  syncWorldCupLiveScores,
  syncWorldCupProviderGroupStandings,
} from "@/lib/world-cup/worldCupDataSyncService"
import { recalculateWorldCupChallenge } from "@/lib/world-cup/worldCupScoringService"
import { getWorldCupOperationsReadiness } from "@/lib/world-cup/worldCupOperationsReadiness"

// ─── Typed mocks ─────────────────────────────────────────────────────────────

const mockRequireAdmin = requireAdmin as ReturnType<typeof vi.fn>
const mockFindMany = prisma.worldCupBracketChallenge.findMany as ReturnType<typeof vi.fn>
const mockSyncFixtures = syncWorldCupFixtures as ReturnType<typeof vi.fn>
const mockSyncLiveScores = syncWorldCupLiveScores as ReturnType<typeof vi.fn>
const mockSyncStandings = syncWorldCupProviderGroupStandings as ReturnType<typeof vi.fn>
const mockRecompute = recalculateWorldCupChallenge as ReturnType<typeof vi.fn>
const mockGrounding = getWorldCupOperationsReadiness as ReturnType<typeof vi.fn>

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeAdminOk() {
  mockRequireAdmin.mockResolvedValue({ ok: true, user: { id: "admin-1", role: "admin" } })
}

function makeAdminUnauthorized() {
  mockRequireAdmin.mockResolvedValue({
    ok: false,
    res: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
  })
}

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/admin/world-cup/actions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

function makeActiveChallenges(ids: string[]) {
  mockFindMany.mockResolvedValue(ids.map((id) => ({ id })))
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("POST /api/admin/world-cup/actions — auth guard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 401 when not admin", async () => {
    makeAdminUnauthorized()
    const res = await POST(makeRequest({ action: "sync-fixtures" }))
    expect(res.status).toBe(401)
  })

  it("returns 400 for unknown action", async () => {
    makeAdminOk()
    const res = await POST(makeRequest({ action: "totally-made-up" }))
    expect(res.status).toBe(400)
    const body = await res.json() as { error: string }
    expect(body.error).toMatch(/unknown action/i)
  })

  it("returns 400 when action is missing from body", async () => {
    makeAdminOk()
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
    const body = await res.json() as { error: string }
    expect(body.error).toMatch(/missing action/i)
  })
})

describe("POST /api/admin/world-cup/actions — sync-fixtures", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    makeAdminOk()
  })

  it("calls syncWorldCupFixtures and returns counts", async () => {
    mockSyncFixtures.mockResolvedValue({
      created: 10,
      updated: 5,
      skipped: 2,
      officialFixturesCreated: 8,
      officialFixturesUpdated: 4,
      bracketMatchesUpdated: 3,
      warnings: [],
    })

    const res = await POST(makeRequest({ action: "sync-fixtures" }))
    expect(res.status).toBe(200)
    const body = await res.json() as {
      action: string
      ok: boolean
      counts: Record<string, number>
      challengesProcessed: number
      warnings: string[]
    }
    expect(body.action).toBe("sync-fixtures")
    expect(body.ok).toBe(true)
    expect(body.counts.created).toBe(10)
    expect(body.counts.updated).toBe(5)
    expect(body.counts.bracketMatchesUpdated).toBe(3)
    expect(body.warnings).toEqual([])
    expect(mockSyncFixtures).toHaveBeenCalledOnce()
  })

  it("returns ok:false when syncWorldCupFixtures throws", async () => {
    mockSyncFixtures.mockRejectedValue(new Error("provider timeout"))

    const res = await POST(makeRequest({ action: "sync-fixtures" }))
    expect(res.status).toBe(500)
    const body = await res.json() as { ok: boolean; error: string }
    expect(body.ok).toBe(false)
    expect(body.error).toContain("provider timeout")
  })
})

describe("POST /api/admin/world-cup/actions — sync-live-scores", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    makeAdminOk()
  })

  it("iterates active challenges and aggregates counts", async () => {
    makeActiveChallenges(["ch-1", "ch-2"])
    mockSyncLiveScores.mockResolvedValue({
      updated: 3,
      skipped: 1,
      finalMatches: 2,
      warnings: [],
      recalculated: true,
    })

    const res = await POST(makeRequest({ action: "sync-live-scores" }))
    expect(res.status).toBe(200)
    const body = await res.json() as {
      ok: boolean
      counts: Record<string, number>
      challengesProcessed: number
    }
    expect(body.ok).toBe(true)
    expect(body.counts.updated).toBe(6)  // 3 × 2 challenges
    expect(body.counts.finalMatches).toBe(4)
    expect(body.challengesProcessed).toBe(2)
    expect(mockSyncLiveScores).toHaveBeenCalledTimes(2)
  })

  it("returns ok:true with zero counts when no active challenges", async () => {
    makeActiveChallenges([])

    const res = await POST(makeRequest({ action: "sync-live-scores" }))
    expect(res.status).toBe(200)
    const body = await res.json() as { ok: boolean; counts: Record<string, number>; challengesProcessed: number }
    expect(body.ok).toBe(true)
    expect(body.challengesProcessed).toBe(0)
    expect(body.counts.updated).toBe(0)
    expect(mockSyncLiveScores).not.toHaveBeenCalled()
  })
})

describe("POST /api/admin/world-cup/actions — recompute-scores", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    makeAdminOk()
  })

  it("calls recalculateWorldCupChallenge for each active challenge", async () => {
    makeActiveChallenges(["ch-1"])
    mockRecompute.mockResolvedValue([{ entryId: "e1" }, { entryId: "e2" }])

    const res = await POST(makeRequest({ action: "recompute-scores" }))
    expect(res.status).toBe(200)
    const body = await res.json() as { ok: boolean; challengesProcessed: number }
    expect(body.ok).toBe(true)
    expect(body.challengesProcessed).toBe(1)
    expect(mockRecompute).toHaveBeenCalledWith("ch-1")
  })

  it("records warning and partial success when one challenge throws", async () => {
    makeActiveChallenges(["ch-ok", "ch-fail"])
    mockRecompute
      .mockResolvedValueOnce([{ entryId: "e1" }])
      .mockRejectedValueOnce(new Error("scoring error"))

    const res = await POST(makeRequest({ action: "recompute-scores" }))
    // at least one challenge processed → ok: true
    expect(res.status).toBe(200)
    const body = await res.json() as { ok: boolean; warnings: string[]; challengesProcessed: number }
    expect(body.ok).toBe(true)
    expect(body.challengesProcessed).toBe(1)
    expect(body.warnings.some((w) => w.includes("scoring error"))).toBe(true)
  })
})

describe("POST /api/admin/world-cup/actions — rebuild-grounding", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    makeAdminOk()
  })

  it("returns AI grounding readiness counts without mutating data", async () => {
    mockGrounding.mockResolvedValue({
      provider: { configured: true },
      data: {
        productionStatus: "ready",
        groupStageReady: true,
        knockoutsReady: false,
        standingsSynced: true,
        standingsState: "complete",
        fixtureCount: 64,
        groupStageFixtureCount: 48,
        knockoutFixtureCount: 16,
        standingsRowCount: 96,
        warnings: [],
      },
    })

    const res = await POST(makeRequest({ action: "rebuild-grounding" }))
    expect(res.status).toBe(200)
    const body = await res.json() as {
      ok: boolean
      counts: Record<string, number>
      challengesProcessed: number
    }
    expect(body.ok).toBe(true)
    expect(body.counts.fixtureCount).toBe(64)
    expect(body.counts.standingsRowCount).toBe(96)
    expect(body.counts.aiGroundingReady).toBe(1)
    expect(body.challengesProcessed).toBe(0)
    // Should NOT call any sync service
    expect(mockSyncFixtures).not.toHaveBeenCalled()
    expect(mockSyncLiveScores).not.toHaveBeenCalled()
    expect(mockRecompute).not.toHaveBeenCalled()
  })

  it("returns aiGroundingReady:0 when fixtures are missing", async () => {
    mockGrounding.mockResolvedValue({
      provider: { configured: false },
      data: {
        productionStatus: "not_ready",
        groupStageReady: false,
        knockoutsReady: false,
        standingsSynced: false,
        standingsState: "none",
        fixtureCount: 0,
        groupStageFixtureCount: 0,
        knockoutFixtureCount: 0,
        standingsRowCount: 0,
        warnings: ["No fixtures loaded"],
      },
    })

    const res = await POST(makeRequest({ action: "rebuild-grounding" }))
    const body = await res.json() as { counts: Record<string, number>; warnings: string[] }
    expect(body.counts.fixtureCount).toBe(0)
    expect(body.counts.aiGroundingReady).toBe(0)
    expect(body.warnings).toContain("No fixtures loaded")
  })
})
