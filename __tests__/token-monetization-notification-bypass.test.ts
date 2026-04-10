import { describe, expect, it, beforeEach, afterEach, vi } from "vitest"

describe("token monetization notification bypass", () => {
  const prevTokenBypass = process.env.TOKEN_NOTIFICATION_BYPASS_USER_IDS
  const prevDevAdmin = process.env.DEV_ADMIN_USER_IDS

  beforeEach(() => {
    vi.resetModules()
    delete process.env.TOKEN_NOTIFICATION_BYPASS_USER_IDS
    delete process.env.DEV_ADMIN_USER_IDS
  })

  afterEach(() => {
    if (prevTokenBypass != null) process.env.TOKEN_NOTIFICATION_BYPASS_USER_IDS = prevTokenBypass
    else delete process.env.TOKEN_NOTIFICATION_BYPASS_USER_IDS
    if (prevDevAdmin != null) process.env.DEV_ADMIN_USER_IDS = prevDevAdmin
    else delete process.env.DEV_ADMIN_USER_IDS
  })

  it("suppresses token purchase nudges for allowlisted user id", async () => {
    process.env.TOKEN_NOTIFICATION_BYPASS_USER_IDS = "944bb9f1-7a25-455b-8ef2-66146dbf3553"
    const { shouldSuppressTokenMonetizationNotification } = await import(
      "@/lib/notifications/tokenMonetizationNotificationBypass"
    )
    expect(
      shouldSuppressTokenMonetizationNotification("944bb9f1-7a25-455b-8ef2-66146dbf3553", {
        type: "promo",
        title: "Buy more AI tokens",
        body: "Your balance is low",
        category: "system_account",
      })
    ).toBe(true)
  })

  it("does not suppress unrelated users", async () => {
    process.env.TOKEN_NOTIFICATION_BYPASS_USER_IDS = "944bb9f1-7a25-455b-8ef2-66146dbf3553"
    const { shouldSuppressTokenMonetizationNotification } = await import(
      "@/lib/notifications/tokenMonetizationNotificationBypass"
    )
    expect(
      shouldSuppressTokenMonetizationNotification("other-user", {
        type: "promo",
        title: "Buy more AI tokens",
        category: "system_account",
      })
    ).toBe(false)
  })

  it("does not suppress trade alerts without token wording", async () => {
    process.env.TOKEN_NOTIFICATION_BYPASS_USER_IDS = "944bb9f1-7a25-455b-8ef2-66146dbf3553"
    const { shouldSuppressTokenMonetizationNotification } = await import(
      "@/lib/notifications/tokenMonetizationNotificationBypass"
    )
    expect(
      shouldSuppressTokenMonetizationNotification("944bb9f1-7a25-455b-8ef2-66146dbf3553", {
        type: "trade_alert",
        title: "New trade offer",
        category: "trade_proposals",
      })
    ).toBe(false)
  })
})
