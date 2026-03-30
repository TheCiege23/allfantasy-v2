import { describe, expect, it } from "vitest"
import { resolveSubscriptionStatus } from "@/lib/subscription/SubscriptionStatusResolver"

describe("SubscriptionStatusResolver", () => {
  it("returns active when period end is in future", () => {
    const status = resolveSubscriptionStatus({
      status: "active",
      currentPeriodEnd: "2099-01-01T00:00:00.000Z",
    })
    expect(status).toBe("active")
  })

  it("returns grace when past_due has a future grace date", () => {
    const status = resolveSubscriptionStatus({
      status: "past_due",
      currentPeriodEnd: "2025-01-01T00:00:00.000Z",
      gracePeriodEnd: "2099-01-01T00:00:00.000Z",
    })
    expect(status).toBe("grace")
  })

  it("returns expired when active period and grace are both over", () => {
    const status = resolveSubscriptionStatus({
      status: "active",
      currentPeriodEnd: "2020-01-01T00:00:00.000Z",
      gracePeriodEnd: "2020-02-01T00:00:00.000Z",
    })
    expect(status).toBe("expired")
  })

  it("returns none when no status and no periods exist", () => {
    const status = resolveSubscriptionStatus({
      status: null,
      currentPeriodEnd: null,
      gracePeriodEnd: null,
    })
    expect(status).toBe("none")
  })
})
