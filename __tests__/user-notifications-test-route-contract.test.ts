import { beforeEach, describe, expect, it, vi } from "vitest"

const getServerSessionMock = vi.hoisted(() => vi.fn())
const rateLimitMock = vi.hoisted(() => vi.fn(() => ({ success: true })))
const getClientIpMock = vi.hoisted(() => vi.fn(() => "127.0.0.1"))
const getSettingsProfileMock = vi.hoisted(() => vi.fn())
const createPlatformNotificationMock = vi.hoisted(() => vi.fn())
const sendNotificationEmailMock = vi.hoisted(() => vi.fn())
const sendSmsMock = vi.hoisted(() => vi.fn())

vi.mock("next-auth", () => ({
  getServerSession: getServerSessionMock,
}))

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}))

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: rateLimitMock,
  getClientIp: getClientIpMock,
}))

vi.mock("@/lib/user-settings", () => ({
  getSettingsProfile: getSettingsProfileMock,
}))

vi.mock("@/lib/platform/notification-service", () => ({
  createPlatformNotification: createPlatformNotificationMock,
}))

vi.mock("@/lib/resend-client", () => ({
  sendNotificationEmail: sendNotificationEmailMock,
}))

vi.mock("@/lib/twilio-client", () => ({
  sendSms: sendSmsMock,
}))

describe("User notifications test route contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getServerSessionMock.mockResolvedValue({ user: { id: "u1" } })
    rateLimitMock.mockReturnValue({ success: true })
    getSettingsProfileMock.mockResolvedValue({
      email: "user@example.com",
      phone: "+15551234567",
      phoneVerifiedAt: new Date("2026-01-01T00:00:00.000Z"),
      notificationPreferences: {
        globalEnabled: true,
        categories: {
          ai_alerts: { enabled: true, inApp: true, email: true, sms: true },
        },
      },
    })
    createPlatformNotificationMock.mockResolvedValue(true)
    sendNotificationEmailMock.mockResolvedValue({ ok: true })
    sendSmsMock.mockResolvedValue(true)
  })

  it("requires authentication", async () => {
    getServerSessionMock.mockResolvedValueOnce(null)
    const { POST } = await import("@/app/api/user/notifications/test/route")
    const res = await POST(
      new Request("http://localhost/api/user/notifications/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ category: "ai_alerts", channels: { inApp: true } }),
      }) as any
    )
    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toEqual({ error: "Unauthorized" })
  })

  it("returns rate limited when guard fails", async () => {
    rateLimitMock.mockReturnValueOnce({ success: false })
    const { POST } = await import("@/app/api/user/notifications/test/route")
    const res = await POST(
      new Request("http://localhost/api/user/notifications/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ category: "ai_alerts", channels: { inApp: true } }),
      }) as any
    )
    expect(res.status).toBe(429)
    await expect(res.json()).resolves.toMatchObject({ error: "RATE_LIMITED" })
  })

  it("sends requested channels when enabled and available", async () => {
    const { POST } = await import("@/app/api/user/notifications/test/route")
    const res = await POST(
      new Request("http://localhost/api/user/notifications/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          category: "ai_alerts",
          channels: { inApp: true, email: true, sms: true },
        }),
      }) as any
    )
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      ok: true,
      sent: { inApp: true, email: true, sms: true },
    })
    expect(createPlatformNotificationMock).toHaveBeenCalledTimes(1)
    expect(sendNotificationEmailMock).toHaveBeenCalledTimes(1)
    expect(sendSmsMock).toHaveBeenCalledTimes(1)
  })

  it("reports blocked reasons when category is disabled", async () => {
    getSettingsProfileMock.mockResolvedValueOnce({
      email: "user@example.com",
      phone: "+15551234567",
      phoneVerifiedAt: new Date("2026-01-01T00:00:00.000Z"),
      notificationPreferences: {
        globalEnabled: true,
        categories: {
          ai_alerts: { enabled: false, inApp: false, email: false, sms: false },
        },
      },
    })

    const { POST } = await import("@/app/api/user/notifications/test/route")
    const res = await POST(
      new Request("http://localhost/api/user/notifications/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          category: "ai_alerts",
          channels: { inApp: true, email: true, sms: true },
        }),
      }) as any
    )
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      ok: false,
      blockedReasons: expect.arrayContaining(["category_disabled", "inapp_disabled", "email_disabled", "sms_disabled"]),
    })
  })
})
