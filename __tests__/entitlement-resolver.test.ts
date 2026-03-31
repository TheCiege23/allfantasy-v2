import { beforeEach, describe, expect, it, vi } from "vitest"

const userSubscriptionFindManyMock = vi.hoisted(() => vi.fn())

vi.mock("@/lib/prisma", () => ({
  prisma: {
    userSubscription: {
      findMany: userSubscriptionFindManyMock,
    },
  },
}))

describe("EntitlementResolver", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.DEV_ADMIN_USER_IDS
  })

  it("returns none when user has no subscriptions", async () => {
    userSubscriptionFindManyMock.mockResolvedValueOnce([])
    const { EntitlementResolver } = await import("@/lib/subscription/EntitlementResolver")
    const resolver = new EntitlementResolver()
    const snapshot = await resolver.resolveSnapshot("u1")
    expect(snapshot).toMatchObject({
      plans: [],
      status: "none",
      currentPeriodEnd: null,
      gracePeriodEnd: null,
    })
  })

  it("maps all_access plan and inherits other feature groups", async () => {
    userSubscriptionFindManyMock.mockResolvedValueOnce([
      {
        status: "active",
        currentPeriodEnd: new Date("2099-01-01T00:00:00.000Z"),
        gracePeriodEnd: null,
        expiresAt: null,
        sku: "af_all_access_monthly",
        plan: { code: "af_all_access" },
      },
    ])
    const { EntitlementResolver } = await import("@/lib/subscription/EntitlementResolver")
    const resolver = new EntitlementResolver()
    const snapshot = await resolver.resolveSnapshot("u1")

    expect(snapshot.status).toBe("active")
    expect(snapshot.plans).toContain("all_access")
    expect(resolver.hasFeatureAccess(snapshot, "trade_analyzer")).toBe(true)
    expect(resolver.hasFeatureAccess(snapshot, "commissioner_automation")).toBe(true)
    expect(resolver.hasFeatureAccess(snapshot, "draft_strategy_build")).toBe(true)
  })

  it("treats expired subscriptions as locked features", async () => {
    userSubscriptionFindManyMock.mockResolvedValueOnce([
      {
        status: "expired",
        currentPeriodEnd: new Date("2020-01-01T00:00:00.000Z"),
        gracePeriodEnd: null,
        expiresAt: new Date("2020-01-01T00:00:00.000Z"),
        sku: "af_pro_monthly",
        plan: { code: "af_pro" },
      },
    ])
    const { EntitlementResolver } = await import("@/lib/subscription/EntitlementResolver")
    const resolver = new EntitlementResolver()
    const resolved = await resolver.resolveForUser("u1", "ai_chat")

    expect(resolved.entitlement.status).toBe("expired")
    expect(resolved.hasAccess).toBe(false)
    expect(resolved.message).toContain("expired")
  })

  it("returns all-access entitlement for configured dev admins", async () => {
    process.env.DEV_ADMIN_USER_IDS = "dev-user-1"

    const { EntitlementResolver } = await import("@/lib/subscription/EntitlementResolver")
    const resolver = new EntitlementResolver()
    const snapshot = await resolver.resolveSnapshot("dev-user-1")

    expect(snapshot).toMatchObject({
      plans: ["all_access"],
      status: "active",
      currentPeriodEnd: null,
      gracePeriodEnd: null,
    })
    expect(userSubscriptionFindManyMock).not.toHaveBeenCalled()
  })
})
