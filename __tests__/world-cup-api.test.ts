import { beforeEach, describe, expect, it, vi } from "vitest"

const requireWorldCupApiUserMock = vi.hoisted(() => vi.fn())
const getWorldCupApiUserMock = vi.hoisted(() => vi.fn())
const getWorldCupAdminStateMock = vi.hoisted(() => vi.fn())
const assertWorldCupManagerMock = vi.hoisted(() => vi.fn())
const challengeParamsSafeParseMock = vi.hoisted(() => vi.fn())
const entryParamsSafeParseMock = vi.hoisted(() => vi.fn())
const getEntryDetailMock = vi.hoisted(() => vi.fn())
const getChallengeViewMock = vi.hoisted(() => vi.fn())
const savePickMock = vi.hoisted(() => vi.fn())
const loadWorldCupTestFixturesMock = vi.hoisted(() => vi.fn())
const importWorldCupReadinessDataMock = vi.hoisted(() => vi.fn())
const isChallengeLockedMock = vi.hoisted(() => vi.fn())
const entryFindUniqueMock = vi.hoisted(() => vi.fn())
const pickDeleteManyMock = vi.hoisted(() => vi.fn())
const pickFindManyMock = vi.hoisted(() => vi.fn())

vi.mock("@/app/api/brackets/world-cup/_utils", () => ({
  requireWorldCupApiUser: requireWorldCupApiUserMock,
  getWorldCupApiUser: getWorldCupApiUserMock,
  getWorldCupAdminState: getWorldCupAdminStateMock,
  assertWorldCupManager: assertWorldCupManagerMock,
  worldCupChallengeParamsSchema: {
    safeParse: challengeParamsSafeParseMock,
  },
  worldCupEntryParamsSchema: {
    safeParse: entryParamsSafeParseMock,
  },
}))

vi.mock("@/lib/world-cup", () => ({
  WORLD_CUP_BRACKET_LOCKED_MESSAGE: "Bracket is locked.",
  getWorldCupChallengeView: getChallengeViewMock,
  getWorldCupBracketEntryDetail: getEntryDetailMock,
  saveWorldCupBracketPickForEntry: savePickMock,
}))

vi.mock("@/lib/world-cup/worldCupBracketBuilder", () => ({
  isWorldCupChallengeLocked: isChallengeLockedMock,
}))

vi.mock("@/lib/world-cup/worldCupSimulationService", () => ({
  loadWorldCupTestFixtures: loadWorldCupTestFixturesMock,
}))

vi.mock("@/lib/world-cup/worldCupImportService", () => ({
  importWorldCupReadinessData: importWorldCupReadinessDataMock,
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    worldCupBracketEntry: {
      findUnique: entryFindUniqueMock,
    },
    worldCupBracketPick: {
      deleteMany: pickDeleteManyMock,
      findMany: pickFindManyMock,
    },
  },
}))

const routeContext = {
  params: {
    challengeId: "wc1",
    entryId: "entry-1",
  },
}

describe("World Cup entry pick API lock enforcement", () => {
  beforeEach(() => {
    vi.resetModules()
    requireWorldCupApiUserMock.mockResolvedValue({ ok: true, user: { id: "u1" } })
    getWorldCupApiUserMock.mockResolvedValue({ id: "u1" })
    getWorldCupAdminStateMock.mockResolvedValue(false)
    assertWorldCupManagerMock.mockResolvedValue({ ok: true, isAdmin: false, challenge: { id: "wc1" } })
    challengeParamsSafeParseMock.mockImplementation((params) => ({ success: true, data: params }))
    entryParamsSafeParseMock.mockImplementation((params) => ({ success: true, data: params }))
    getEntryDetailMock.mockResolvedValue({ id: "entry-1", challengeId: "wc1", userId: "u1" })
    getChallengeViewMock.mockResolvedValue({
      challenge: { id: "wc1", lastSyncedAt: "2026-07-01T20:00:00.000Z" },
      leaderboard: [],
      scoring: {},
    })
    savePickMock.mockResolvedValue({
      entry: { id: "entry-1" },
      pick: { id: "pick-1" },
      picks: [{ id: "pick-1", matchId: "m1", selectedTeamId: "arg", selectedSlotKey: "A1" }],
      isComplete: false,
    })
    loadWorldCupTestFixturesMock.mockResolvedValue({
      success: true,
      teamsCreated: 32,
      teamsUpdated: 0,
      matchesUpdated: 16,
      pickableMatchesAfter: 16,
      totalMatchesAfter: 31,
      unresolvedMatchesAfter: 15,
      warnings: [],
    })
    importWorldCupReadinessDataMock.mockResolvedValue({
      ok: true,
      mode: "all",
      dryRun: false,
      provider: "mock",
      seasonYear: 2026,
      teams: { created: 32, updated: 0, skipped: 0, warnings: [], teams: Array.from({ length: 32 }, (_, idx) => ({ providerId: `${idx + 1}`, name: `Team ${idx + 1}`, action: "created" })) },
      fixtures: { created: 0, updated: 16, skipped: 0, warnings: [], lockTimeInferred: "2026-07-04T16:00:00.000Z", fixtures: Array.from({ length: 16 }, (_, idx) => ({ providerId: `${idx + 1}`, matchId: `m${idx + 1}`, action: "updated" })) },
    })
    isChallengeLockedMock.mockReturnValue({ locked: false, reason: "none", lockAt: null })
    entryFindUniqueMock.mockResolvedValue({
      id: "entry-1",
      userId: "u1",
      challengeId: "wc1",
      challenge: { id: "wc1", matches: [], pickLockStrategy: "tournament_start", pickLockAt: null, status: "open" },
    })
    pickDeleteManyMock.mockResolvedValue({ count: 1 })
    pickFindManyMock.mockResolvedValue([])
  })

  it("allows an unlocked bracket to save picks", async () => {
    const { POST } = await import("@/app/api/brackets/world-cup/[challengeId]/entries/[entryId]/picks/route")

    const res = await POST(
      new Request("http://localhost/api/brackets/world-cup/wc1/entries/entry-1/picks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ matchId: "m1", selectedTeamId: "arg", selectedSlotKey: "A1" }),
      }),
      routeContext
    )

    expect(res.status).toBe(200)
    expect(savePickMock).toHaveBeenCalledWith(
      expect.objectContaining({
        entryId: "entry-1",
        userId: "u1",
        matchId: "m1",
        selectedTeamId: "arg",
      })
    )
  })

  it("rejects save requests after the bracket locks", async () => {
    savePickMock.mockRejectedValueOnce(new Error("Bracket is locked."))
    const { POST } = await import("@/app/api/brackets/world-cup/[challengeId]/entries/[entryId]/picks/route")

    const res = await POST(
      new Request("http://localhost/api/brackets/world-cup/wc1/entries/entry-1/picks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ matchId: "m1", selectedTeamId: "arg", selectedSlotKey: "A1" }),
      }),
      routeContext
    )

    expect(res.status).toBe(423)
    await expect(res.json()).resolves.toEqual({ error: "Bracket is locked." })
  })

  it("rejects clear requests after the bracket locks", async () => {
    isChallengeLockedMock.mockReturnValueOnce({
      locked: true,
      reason: "tournament_started",
      lockAt: "2026-07-01T16:00:00Z",
    })
    const { DELETE } = await import("@/app/api/brackets/world-cup/[challengeId]/entries/[entryId]/picks/route")

    const res = await DELETE(
      new Request("http://localhost/api/brackets/world-cup/wc1/entries/entry-1/picks", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ matchIds: ["m1"] }),
      }),
      routeContext
    )

    expect(res.status).toBe(423)
    await expect(res.json()).resolves.toEqual({ error: "Bracket is locked." })
    expect(pickDeleteManyMock).not.toHaveBeenCalled()
  })

  it("returns recalculated leaderboard rows from the leaderboard route", async () => {
    getChallengeViewMock.mockResolvedValueOnce({
      challenge: { id: "wc1", lastSyncedAt: "2026-07-01T20:00:00.000Z" },
      leaderboard: [
        {
          rank: 1,
          entryId: "entry-1",
          entryName: "Bracket 1",
          participantId: "p1",
          userId: "u1",
          username: "player",
          avatarUrl: null,
          displayName: "Player",
          totalScore: 12,
          maxPossibleScore: 28,
          correctPicks: 2,
          incorrectPicks: 1,
          championPickName: "Argentina",
          championTeamId: "arg",
          championStillAlive: true,
          roundBreakdown: { round_of_32: 12 },
          joinedAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-07-01T20:00:00.000Z",
        },
      ],
      scoring: { roundOf32Points: 6 },
    })
    const { GET } = await import("@/app/api/brackets/world-cup/[challengeId]/leaderboard/route")

    const res = await GET(
      new Request("http://localhost/api/brackets/world-cup/wc1/leaderboard"),
      { params: { challengeId: "wc1" } }
    )

    expect(res.status).toBe(200)
    expect(getChallengeViewMock).toHaveBeenCalledWith({
      challengeId: "wc1",
      user: { id: "u1" },
      isAdmin: false,
    })
    await expect(res.json()).resolves.toMatchObject({
      leaderboard: [{ entryId: "entry-1", totalScore: 12, maxPossibleScore: 28 }],
      lastSyncedAt: "2026-07-01T20:00:00.000Z",
      scoring: { roundOf32Points: 6 },
    })
  })

  it("admin mock seed route creates pickable test matchups", async () => {
    const { POST } = await import("@/app/api/admin/world-cup/seed-mock/route")

    const res = await POST(
      new Request("http://localhost/api/admin/world-cup/seed-mock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ challengeId: "wc1", confirmTestFixtures: true }),
      })
    )

    expect(res.status).toBe(200)
    expect(loadWorldCupTestFixturesMock).toHaveBeenCalledWith("wc1", { dryRun: false })
    await expect(res.json()).resolves.toMatchObject({
      ok: true,
      result: {
        matchesUpdated: 16,
        pickableMatchesAfter: 16,
        unresolvedMatchesAfter: 15,
      },
    })
  })

  it("admin import route returns team and fixture readiness counts", async () => {
    getWorldCupAdminStateMock.mockResolvedValueOnce(true)
    const { POST } = await import("@/app/api/admin/world-cup/import/route")

    const res = await POST(
      new Request("http://localhost/api/admin/world-cup/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ challengeId: "wc1", provider: "mock", mode: "all" }),
      })
    )

    expect(res.status).toBe(200)
    expect(importWorldCupReadinessDataMock).toHaveBeenCalledWith(
      expect.objectContaining({ challengeId: "wc1", provider: "mock", mode: "all" })
    )
    await expect(res.json()).resolves.toMatchObject({
      ok: true,
      teamCount: 32,
      fixtureCount: 16,
    })
  })
})
