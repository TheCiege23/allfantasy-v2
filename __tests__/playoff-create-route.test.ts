import { beforeEach, describe, expect, it, vi } from "vitest"

const createPlayoffBracketChallengeMock = vi.hoisted(() => vi.fn())
const createPlayoffBracketEntryMock = vi.hoisted(() => vi.fn())
const getPlayoffBracketViewMock = vi.hoisted(() => vi.fn())
const listUserPlayoffChallengesMock = vi.hoisted(() => vi.fn())
const requireWorldCupApiUserMock = vi.hoisted(() => vi.fn())

vi.mock("@/lib/playoffs/playoffService", () => ({
  createPlayoffBracketChallenge: createPlayoffBracketChallengeMock,
  createPlayoffBracketEntry: createPlayoffBracketEntryMock,
  getPlayoffBracketView: getPlayoffBracketViewMock,
  listUserPlayoffChallenges: listUserPlayoffChallengesMock,
}))

vi.mock("@/app/api/brackets/playoffs/_utils", () => ({
  playoffChallengeParamsSchema: {
    safeParse: (params: any) => params?.challengeId ? { success: true, data: params } : { success: false },
  },
  requireWorldCupApiUser: requireWorldCupApiUserMock,
}))

describe("playoff create/list route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireWorldCupApiUserMock.mockResolvedValue({
      ok: true,
      user: { id: "user-1", email: "user@example.com", name: "User" },
    })
  })

  it("returns challengeId and redirectUrl for NBA create", async () => {
    createPlayoffBracketChallengeMock.mockResolvedValue({
      challengeId: "challenge-nba",
      entryId: null,
      sport: "nba",
      name: "NBA Playoff Pool",
      redirectUrl: "/brackets/leagues/challenge-nba",
    })

    const { POST } = await import("@/app/api/brackets/playoffs/route")

    const response = await POST(
      new Request("http://localhost/api/brackets/playoffs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sport: "nba",
          seasonYear: 2026,
          config: {
            visibility: "public",
            includePlayIn: true,
            pickSpread: true,
          },
        }),
      })
    )

    expect(response.status).toBe(200)
    const payload = await response.json()
    expect(payload.challengeId).toBe("challenge-nba")
    expect(payload.redirectUrl).toBe("/brackets/leagues/challenge-nba")
    expect(payload.sport).toBe("nba")
    expect(createPlayoffBracketChallengeMock).toHaveBeenCalledWith(expect.objectContaining({
      config: expect.objectContaining({
        visibility: "public",
        includePlayIn: true,
        pickSpread: true,
      }),
    }))
  })

  it("returns challengeId and redirectUrl for NHL create", async () => {
    createPlayoffBracketChallengeMock.mockResolvedValue({
      challengeId: "challenge-nhl",
      entryId: null,
      sport: "nhl",
      name: "NHL Playoff Pool",
      redirectUrl: "/brackets/leagues/challenge-nhl",
    })

    const { POST } = await import("@/app/api/brackets/playoffs/route")

    const response = await POST(
      new Request("http://localhost/api/brackets/playoffs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sport: "nhl", seasonYear: 2026 }),
      })
    )

    expect(response.status).toBe(200)
    const payload = await response.json()
    expect(payload.challengeId).toBe("challenge-nhl")
    expect(payload.redirectUrl).toBe("/brackets/leagues/challenge-nhl")
    expect(payload.sport).toBe("nhl")
  })

  it("accepts normal form payload fields for NBA create", async () => {
    createPlayoffBracketChallengeMock.mockResolvedValue({
      challengeId: "challenge-nba-form",
      entryId: null,
      sport: "nba",
      name: "Friends NBA",
      redirectUrl: "/brackets/leagues/challenge-nba-form",
    })

    const { POST } = await import("@/app/api/brackets/playoffs/route")
    const response = await POST(
      new Request("http://localhost/api/brackets/playoffs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Friends NBA",
          sport: "nba",
          visibility: "private",
          maxUsers: 40,
          bracketsPerUser: 1,
          scoringStyle: "standard",
          lockRule: "series_start",
        }),
      })
    )

    expect(response.status).toBe(200)
    expect(createPlayoffBracketChallengeMock).toHaveBeenCalledWith(expect.objectContaining({
      config: expect.objectContaining({
        visibility: "private",
        maxParticipants: 40,
        maxEntriesPerParticipant: 1,
        scoringStyle: "standard",
        lockRule: "series_start",
      }),
    }))
  })

  it("returns safe JSON error if playoff challenge create throws", async () => {
    createPlayoffBracketChallengeMock.mockRejectedValue(new Error("database exploded with internal detail"))

    const { POST } = await import("@/app/api/brackets/playoffs/route")
    const response = await POST(
      new Request("http://localhost/api/brackets/playoffs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sport: "nhl", seasonYear: 2026 }),
      })
    )

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      code: "PLAYOFF_CREATE_FAILED",
      message: "Playoff pool creation failed. Please try again.",
      details: { reason: "database exploded with internal detail" },
    })
  })

  it("falls back to standard create when config column migration is pending", async () => {
    createPlayoffBracketChallengeMock
      .mockRejectedValueOnce(Object.assign(new Error("Unknown arg `config`"), { code: "P2022" }))
      .mockResolvedValueOnce({
        challengeId: "challenge-fallback",
        entryId: null,
        sport: "nba",
        name: "NBA Pool",
        redirectUrl: "/brackets/leagues/challenge-fallback",
      })

    const { POST } = await import("@/app/api/brackets/playoffs/route")
    const response = await POST(
      new Request("http://localhost/api/brackets/playoffs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sport: "nba", config: { visibility: "public" } }),
      })
    )

    expect(response.status).toBe(200)
    const payload = await response.json()
    expect(payload.warning).toMatchObject({ code: "PLAYOFF_CONFIG_MIGRATION_PENDING" })
    expect(createPlayoffBracketChallengeMock).toHaveBeenLastCalledWith(expect.objectContaining({
      config: null,
      options: { includeConfig: false },
    }))
  })

  it("returns NHL challenge from list response for home/discover consumption", async () => {
    listUserPlayoffChallengesMock.mockResolvedValue([
      {
        challengeId: "challenge-nhl",
        sport: "nhl",
        name: "NHL Playoff Pool",
        redirectUrl: "/brackets/leagues/challenge-nhl",
        seasonYear: 2026,
        participantCount: 2,
        entryCount: 2,
        inviteCode: "ABCDEFGH",
      },
    ])

    const { GET } = await import("@/app/api/brackets/playoffs/route")

    const response = await GET(new Request("http://localhost/api/brackets/playoffs?sport=nhl"))
    expect(response.status).toBe(200)

    const payload = await response.json()
    expect(payload.challenges).toHaveLength(1)
    expect(payload.challenges[0].sport).toBe("nhl")
    expect(payload.challenges[0].challengeId).toBe("challenge-nhl")
  })

  it("creates a playoff entry from the challenge detail route", async () => {
    createPlayoffBracketEntryMock.mockResolvedValue({
      challengeId: "challenge-nba",
      entryId: "entry-1",
      redirectUrl: "/brackets/leagues/challenge-nba/entries/entry-1",
    })
    const { POST } = await import("@/app/api/brackets/playoffs/[challengeId]/route")

    const response = await POST(
      new Request("http://localhost/api/brackets/playoffs/challenge-nba", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "create_entry" }),
      }),
      { params: { challengeId: "challenge-nba" } }
    )

    expect(response.status).toBe(200)
    const payload = await response.json()
    expect(payload.redirectUrl).toBe("/brackets/leagues/challenge-nba/entries/entry-1")
  })

  it("returns a clear create-entry error when max entries are reached", async () => {
    createPlayoffBracketEntryMock.mockRejectedValue(new Error("Entry limit reached (max 5 per user)"))
    const { POST } = await import("@/app/api/brackets/playoffs/[challengeId]/route")

    const response = await POST(
      new Request("http://localhost/api/brackets/playoffs/challenge-nba", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "create_entry" }),
      }),
      { params: { challengeId: "challenge-nba" } }
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: "Entry limit reached (max 5 per user)",
    })
  })
})
