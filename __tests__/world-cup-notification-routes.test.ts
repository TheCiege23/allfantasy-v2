import { beforeEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"

const requireUserMock = vi.hoisted(() => vi.fn())
const managerAccessMock = vi.hoisted(() => vi.fn())
const finalizeEntryMock = vi.hoisted(() => vi.fn())
const getChallengeViewMock = vi.hoisted(() => vi.fn())
const notifyBracketFinalizedMock = vi.hoisted(() => vi.fn())
const recalculateMock = vi.hoisted(() => vi.fn())
const notifyLeaderboardMock = vi.hoisted(() => vi.fn())
const syncScoresMock = vi.hoisted(() => vi.fn())
const notifyResultsMock = vi.hoisted(() => vi.fn())

vi.mock("@/app/api/brackets/world-cup/_utils", () => ({
  requireWorldCupApiUser: requireUserMock,
  assertWorldCupManager: managerAccessMock,
  worldCupEntryParamsSchema: z.object({ challengeId: z.string().min(1), entryId: z.string().min(1) }),
  worldCupChallengeParamsSchema: z.object({ challengeId: z.string().min(1) }),
}))

vi.mock("@/lib/world-cup/worldCupEntryFinalizeService", () => ({
  finalizeWorldCupEntry: finalizeEntryMock,
  getWorldCupEntryCompletionReview: vi.fn(),
}))

vi.mock("@/lib/world-cup/worldCupBracketService", () => ({
  WORLD_CUP_BRACKET_LOCKED_MESSAGE: "World Cup bracket is locked.",
  getWorldCupChallengeView: getChallengeViewMock,
}))

vi.mock("@/lib/world-cup/worldCupNotifications", () => ({
  notifyWorldCupBracketFinalized: notifyBracketFinalizedMock,
  notifyWorldCupLeaderboardUpdated: notifyLeaderboardMock,
  notifyWorldCupResultsUpdated: notifyResultsMock,
}))

vi.mock("@/lib/world-cup", () => ({
  recalculateWorldCupChallenge: recalculateMock,
}))

vi.mock("@/lib/world-cup/worldCupDataSyncService", () => ({
  syncWorldCupLiveScores: syncScoresMock,
}))

function post(body: unknown = {}) {
  return new Request("http://localhost", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

describe("World Cup notification route wiring", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireUserMock.mockResolvedValue({ ok: true, user: { id: "user-1", email: "u1@example.com" } })
    managerAccessMock.mockResolvedValue({ ok: true })
    finalizeEntryMock.mockResolvedValue({ entry: { id: "entry-1" }, completion: { submittedAt: "now" } })
    getChallengeViewMock.mockResolvedValue({ challenge: { id: "c1", name: "Office Pool" } })
    notifyBracketFinalizedMock.mockResolvedValue([])
    recalculateMock.mockResolvedValue([{ userId: "user-1", rank: 1 }])
    notifyLeaderboardMock.mockResolvedValue([])
    syncScoresMock.mockResolvedValue({
      updated: 2,
      skipped: 0,
      finalMatches: 1,
      recalculated: true,
      warnings: [],
    })
    notifyResultsMock.mockResolvedValue([])
  })

  it("bracket finalize route creates finalized notification", async () => {
    const { POST } = await import("@/app/api/brackets/world-cup/[challengeId]/entries/[entryId]/finalize/route")

    const res = await POST(post(), { params: { challengeId: "c1", entryId: "entry-1" } })

    expect(res.status).toBe(200)
    expect(notifyBracketFinalizedMock).toHaveBeenCalledWith({
      challengeId: "c1",
      poolName: "Office Pool",
      userId: "user-1",
      entryId: "entry-1",
    })
  })

  it("manual recalculate route creates leaderboard notification", async () => {
    const { POST } = await import("@/app/api/brackets/world-cup/[challengeId]/recalculate/route")

    const res = await POST(post(), { params: { challengeId: "c1" } })

    expect(res.status).toBe(200)
    expect(notifyLeaderboardMock).toHaveBeenCalledWith(expect.objectContaining({
      challengeId: "c1",
    }))
  })

  it("live sync route creates results and leaderboard notifications when scores update", async () => {
    const { POST } = await import("@/app/api/brackets/world-cup/[challengeId]/admin/sync-live/route")

    const res = await POST(post({ provider: "mock", dryRun: false, recalculate: true }), { params: { challengeId: "c1" } })

    expect(res.status).toBe(200)
    expect(notifyResultsMock).toHaveBeenCalledWith(expect.objectContaining({ challengeId: "c1" }))
    expect(notifyLeaderboardMock).toHaveBeenCalledWith(expect.objectContaining({ challengeId: "c1" }))
  })

  it("live sync route does not notify on dry run", async () => {
    const { POST } = await import("@/app/api/brackets/world-cup/[challengeId]/admin/sync-live/route")

    const res = await POST(post({ provider: "mock", dryRun: true, recalculate: true }), { params: { challengeId: "c1" } })

    expect(res.status).toBe(200)
    expect(notifyResultsMock).not.toHaveBeenCalled()
    expect(notifyLeaderboardMock).not.toHaveBeenCalled()
  })
})
