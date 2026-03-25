import { beforeEach, describe, expect, it, vi } from "vitest"

const getAlertPreferencesMock = vi.hoisted(() => vi.fn())
const createSportsAlertMock = vi.hoisted(() => vi.fn())

vi.mock("@/lib/sports-alerts/UserAlertPreferences", () => ({
  getAlertPreferences: getAlertPreferencesMock,
}))

vi.mock("@/lib/sports-alerts/SportsAlertService", () => ({
  createSportsAlert: createSportsAlertMock,
}))

describe("sports alert dispatcher timing", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("reports sent/skipped/failed counts with delivery timing metrics", async () => {
    getAlertPreferencesMock
      .mockResolvedValueOnce({ injuryAlerts: true, performanceAlerts: true, lineupAlerts: true })
      .mockResolvedValueOnce({ injuryAlerts: false, performanceAlerts: true, lineupAlerts: true })
      .mockResolvedValueOnce({ injuryAlerts: true, performanceAlerts: true, lineupAlerts: true })
    createSportsAlertMock
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)

    const { dispatchSportsAlert } = await import("@/lib/sports-alerts/AlertDispatcher")
    const result = await dispatchSportsAlert(
      {
        type: "injury_alert",
        title: "Injury update",
        body: "Player is out",
        actionHref: "/app/league/league-1",
        triggeredAt: new Date(Date.now() - 2_000).toISOString(),
      },
      ["u1", "u2", "u3"]
    )

    expect(result.sent).toBe(1)
    expect(result.skipped).toBe(1)
    expect(result.failed).toBe(1)
    expect(result.targetCount).toBe(3)
    expect(result.durationMs).toBeGreaterThanOrEqual(0)
    expect(new Date(result.startedAt).toString()).not.toBe("Invalid Date")
    expect(new Date(result.completedAt).toString()).not.toBe("Invalid Date")
  })
})
