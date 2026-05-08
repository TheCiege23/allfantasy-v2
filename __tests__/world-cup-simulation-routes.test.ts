import { beforeEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"

const requireUserMock = vi.hoisted(() => vi.fn())
const accessMock = vi.hoisted(() => vi.fn())
const simulateMatchMock = vi.hoisted(() => vi.fn())

vi.mock("@/app/api/brackets/world-cup/_utils", () => ({
  requireWorldCupApiUser: requireUserMock,
  assertWorldCupSimulationAccess: accessMock,
  worldCupChallengeParamsSchema: z.object({ challengeId: z.string().min(1) }),
}))

vi.mock("@/lib/world-cup/worldCupSimulationService", () => ({
  simulateWorldCupMatchResult: simulateMatchMock,
}))

describe("world cup simulation admin routes", () => {
  beforeEach(() => {
    requireUserMock.mockReset()
    accessMock.mockReset()
    simulateMatchMock.mockReset()

    requireUserMock.mockResolvedValue({ ok: true, user: { id: "owner-1", email: "owner@example.com" } })
    accessMock.mockResolvedValue({ ok: true, challenge: { id: "c1" }, isAdmin: false })
    simulateMatchMock.mockResolvedValue({ challengeId: "c1", updatedMatch: { id: "m1" } })
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
})
