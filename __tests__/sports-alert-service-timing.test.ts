import { beforeEach, describe, expect, it, vi } from "vitest"

const createPlatformNotificationMock = vi.hoisted(() => vi.fn())

vi.mock("@/lib/platform/notification-service", () => ({
  createPlatformNotification: createPlatformNotificationMock,
}))

describe("sports alert service timing metadata", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("stores dispatch timing metadata for delivery verification", async () => {
    createPlatformNotificationMock.mockResolvedValueOnce(true)
    const triggeredAt = new Date(Date.now() - 3_500).toISOString()

    const { createSportsAlert } = await import("@/lib/sports-alerts/SportsAlertService")
    const ok = await createSportsAlert("user-1", {
      type: "injury_alert",
      title: "Injury alert",
      body: "Starter downgraded to out.",
      actionHref: "/leagues/league-1",
      triggeredAt,
      eventId: "event-abc",
      sport: "NFL",
      leagueId: "league-1",
      playerId: "player-1",
      playerName: "Player One",
    })

    expect(ok).toBe(true)
    expect(createPlatformNotificationMock).toHaveBeenCalledTimes(1)
    const payload = createPlatformNotificationMock.mock.calls[0]?.[0] as {
      meta?: Record<string, unknown>
    }
    const meta = payload.meta ?? {}
    expect(meta.triggeredAt).toBe(triggeredAt)
    expect(typeof meta.dispatchedAt).toBe("string")
    expect(typeof meta.deliveryLatencyMs).toBe("number")
    expect(Number(meta.deliveryLatencyMs)).toBeGreaterThanOrEqual(0)
    expect(meta.eventId).toBe("event-abc")
  })
})
