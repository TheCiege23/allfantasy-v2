import { describe, expect, it, vi } from "vitest"

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(async () => ({
    user: { id: "u1", email: "owner@example.com", name: "Owner" },
  })),
}))

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}))

vi.mock("@/lib/world-cup", () => ({
  createWorldCupBracketChallenge: vi.fn(async () => ({
    id: "wc1",
    inviteUrl: "http://localhost:3000/join/bracket/INVITE",
  })),
  getWorldCupChallengeView: vi.fn(async () => ({
    id: "wc1",
    picks: [],
    leaderboard: [],
    scoring: {},
  })),
  saveWorldCupPicks: vi.fn(async () => ({ id: "wc1", picks: [{ matchId: "m1" }] })),
  syncWorldCupChallenge: vi.fn(async () => ({ id: "wc1" })),
  syncAllOpenWorldCupChallenges: vi.fn(async () => [{ id: "wc1" }]),
  userCanManageWorldCupChallenge: vi.fn(() => true),
  recalculateWorldCupChallenge: vi.fn(async () => []),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    worldCupBracketChallenge: {
      findUnique: vi.fn(async () => ({ id: "wc1", ownerUserId: "u1", inviteCode: "INVITE" })),
    },
  },
}))

vi.mock("@/lib/adminAuth", () => ({
  isAdminEmailAllowed: vi.fn(() => true),
  isAuthorizedRequest: vi.fn(() => true),
}))

describe("World Cup API routes", () => {
  it("creates a bracket challenge", async () => {
    const { POST } = await import("@/app/api/brackets/world-cup/create/route")
    const response = await POST(
      new Request("http://localhost/api/brackets/world-cup/create", {
        method: "POST",
        body: JSON.stringify({ name: "World Cup", seasonYear: 2026 }),
      })
    )
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({ challenge: { id: "wc1" } })
  })

  it("saves picks", async () => {
    const { POST } = await import("@/app/api/brackets/world-cup/[challengeId]/picks/route")
    const response = await POST(
      new Request("http://localhost/api/brackets/world-cup/wc1/picks", {
        method: "POST",
        body: JSON.stringify({ picks: [{ matchId: "m1", selectedSlotKey: "GAW", selectedTeamName: "Group A Winner" }] }),
      }),
      { params: { challengeId: "wc1" } }
    )
    expect(response.status).toBe(200)
  })

  it("syncs challenges for authorized requests", async () => {
    const { POST } = await import("@/app/api/brackets/world-cup/sync/route")
    const response = await POST(
      new Request("http://localhost/api/brackets/world-cup/sync", {
        method: "POST",
        headers: { "x-admin-secret": "secret" },
        body: JSON.stringify({ challengeId: "wc1" }),
      })
    )
    expect(response.status).toBe(200)
  })
})
