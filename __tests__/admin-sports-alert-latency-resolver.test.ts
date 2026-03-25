import { beforeEach, describe, expect, it, vi } from "vitest"

const findManyMock = vi.hoisted(() => vi.fn())

vi.mock("@/lib/prisma", () => ({
  prisma: {
    platformNotification: {
      findMany: findManyMock,
    },
  },
}))

describe("admin sports alert latency resolver", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("computes global and per-type latency percentiles", async () => {
    const now = new Date()
    findManyMock.mockResolvedValueOnce([
      { type: "injury_alert", createdAt: now, meta: { deliveryLatencyMs: 100 } },
      { type: "injury_alert", createdAt: now, meta: { deliveryLatencyMs: 200 } },
      { type: "performance_alert", createdAt: now, meta: { deliveryLatencyMs: "400" } },
      { type: "lineup_alert", createdAt: now, meta: {} },
    ])

    const { getSportsAlertLatency } = await import("@/lib/admin-dashboard/SportsAlertLatencyResolver")
    const metrics = await getSportsAlertLatency()

    expect(metrics.windowHours).toBe(24)
    expect(metrics.totalAlerts).toBe(4)
    expect(metrics.sampledAlerts).toBe(3)
    expect(metrics.p50Ms).toBe(200)
    expect(metrics.p95Ms).toBe(380)
    expect(metrics.maxMs).toBe(400)

    const injury = metrics.byType.find((item) => item.alertType === "injury_alert")
    const performance = metrics.byType.find((item) => item.alertType === "performance_alert")
    const lineup = metrics.byType.find((item) => item.alertType === "lineup_alert")

    expect(injury).toMatchObject({ totalAlerts: 2, sampledAlerts: 2, p95Ms: 195 })
    expect(performance).toMatchObject({ totalAlerts: 1, sampledAlerts: 1, p95Ms: 400 })
    expect(lineup).toMatchObject({ totalAlerts: 1, sampledAlerts: 0, p95Ms: null })
  })

  it("returns empty metrics when query fails", async () => {
    findManyMock.mockRejectedValueOnce(new Error("db unavailable"))

    const { getSportsAlertLatency } = await import("@/lib/admin-dashboard/SportsAlertLatencyResolver")
    const metrics = await getSportsAlertLatency(48)

    expect(metrics.windowHours).toBe(48)
    expect(metrics.totalAlerts).toBe(0)
    expect(metrics.sampledAlerts).toBe(0)
    expect(metrics.p95Ms).toBeNull()
    expect(metrics.byType).toHaveLength(3)
  })
})
