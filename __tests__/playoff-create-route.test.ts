import { beforeEach, describe, expect, it, vi } from "vitest"

const createPlayoffBracketChallengeMock = vi.hoisted(() => vi.fn())
const listUserPlayoffChallengesMock = vi.hoisted(() => vi.fn())
const requireWorldCupApiUserMock = vi.hoisted(() => vi.fn())

vi.mock("@/lib/playoffs/playoffService", () => ({
  createPlayoffBracketChallenge: createPlayoffBracketChallengeMock,
  listUserPlayoffChallenges: listUserPlayoffChallengesMock,
}))

vi.mock("@/app/api/brackets/playoffs/_utils", () => ({
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
        body: JSON.stringify({ sport: "nba", seasonYear: 2026 }),
      })
    )

    expect(response.status).toBe(200)
    const payload = await response.json()
    expect(payload.challengeId).toBe("challenge-nba")
    expect(payload.redirectUrl).toBe("/brackets/leagues/challenge-nba")
    expect(payload.sport).toBe("nba")
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
})
