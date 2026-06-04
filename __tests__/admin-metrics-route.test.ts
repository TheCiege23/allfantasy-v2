import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  getAdminCommandCenterMetrics: vi.fn(),
}))

vi.mock("@/lib/adminAuth", () => ({
  requireAdmin: mocks.requireAdmin,
}))

vi.mock("@/lib/admin-dashboard/AdminCommandCenterService", () => ({
  getAdminCommandCenterMetrics: mocks.getAdminCommandCenterMetrics,
}))

describe("admin metrics route", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it("requires server-side admin access", async () => {
    mocks.requireAdmin.mockResolvedValueOnce({
      ok: false,
      res: Response.json({ error: "Unauthorized" }, { status: 401 }),
    })

    const { GET } = await import("@/app/api/admin/metrics/route")
    const res = await GET(new Request("http://localhost/api/admin/metrics"))

    expect(res.status).toBe(401)
    expect(mocks.getAdminCommandCenterMetrics).not.toHaveBeenCalled()
  })

  it("returns command-center metrics for admins", async () => {
    mocks.requireAdmin.mockResolvedValueOnce({ ok: true, user: { id: "admin-1", role: "admin" } })
    mocks.getAdminCommandCenterMetrics.mockResolvedValueOnce({
      generatedAt: "2026-06-04T00:00:00.000Z",
      users: [{ label: "Total accounts", value: 12, tracked: true }],
      subscriptions: [{ label: "MRR estimate", value: "Not tracked yet", tracked: false }],
      tokens: [],
      ai: [],
      worldCup: [{ label: "World Cup pools", value: 2, tracked: true }],
      health: [],
      usersSearch: [],
      activeWorldCupPools: [],
      recentUsers: [],
      recentSubscriptions: [],
      recentPayments: [],
      recentTokenActivity: [],
    })

    const { GET } = await import("@/app/api/admin/metrics/route")
    const res = await GET(new Request("http://localhost/api/admin/metrics?q=ciege"))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(mocks.getAdminCommandCenterMetrics).toHaveBeenCalledWith("ciege")
    expect(body.users[0]).toMatchObject({ label: "Total accounts", value: 12, tracked: true })
    expect(body.subscriptions[0]).toMatchObject({ label: "MRR estimate", value: "Not tracked yet", tracked: false })
  })
})
