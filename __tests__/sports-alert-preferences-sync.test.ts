import { beforeEach, describe, expect, it, vi } from "vitest"

const getSettingsProfileMock = vi.hoisted(() => vi.fn())
const updateUserProfileMock = vi.hoisted(() => vi.fn())

vi.mock("@/lib/user-settings/SettingsQueryService", () => ({
  getSettingsProfile: getSettingsProfileMock,
}))

vi.mock("@/lib/user-settings/UserProfileService", () => ({
  updateUserProfile: updateUserProfileMock,
}))

describe("sports alert preference sync", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("requires both category enabled and inApp for sports alert bools", async () => {
    getSettingsProfileMock.mockResolvedValueOnce({
      notificationPreferences: {
        categories: {
          injury_alerts: { enabled: false, inApp: true, email: true, sms: false },
          performance_alerts: { enabled: true, inApp: false, email: true, sms: false },
          lineup_alerts: { enabled: true, inApp: true, email: true, sms: false },
        },
      },
    })

    const { getAlertPreferences } = await import("@/lib/sports-alerts/UserAlertPreferences")
    const prefs = await getAlertPreferences("u1")
    expect(prefs).toEqual({
      injuryAlerts: false,
      performanceAlerts: false,
      lineupAlerts: true,
    })
  })

  it("preserves email and sms when sports toggles are updated", async () => {
    getSettingsProfileMock
      .mockResolvedValueOnce({
        notificationPreferences: {
          categories: {
            injury_alerts: { enabled: true, inApp: true, email: true, sms: true },
            performance_alerts: { enabled: true, inApp: true, email: false, sms: false },
            lineup_alerts: { enabled: true, inApp: true, email: true, sms: false },
          },
        },
      })
      .mockResolvedValueOnce({
        notificationPreferences: {
          globalEnabled: true,
          categories: {
            injury_alerts: { enabled: true, inApp: true, email: true, sms: true },
            performance_alerts: { enabled: true, inApp: true, email: false, sms: false },
            lineup_alerts: { enabled: true, inApp: true, email: true, sms: false },
          },
        },
      })

    updateUserProfileMock.mockResolvedValueOnce({ ok: true })

    const { setAlertPreferences } = await import("@/lib/sports-alerts/UserAlertPreferences")
    const result = await setAlertPreferences("u1", { injuryAlerts: false })
    expect(result).toEqual({ ok: true })

    expect(updateUserProfileMock).toHaveBeenCalledTimes(1)
    const payload = updateUserProfileMock.mock.calls[0]?.[1] as {
      notificationPreferences: {
        categories: Record<string, { enabled: boolean; inApp: boolean; email: boolean; sms: boolean }>
      }
    }

    expect(payload.notificationPreferences.categories.injury_alerts).toEqual({
      enabled: false,
      inApp: false,
      email: true,
      sms: true,
    })
  })
})
