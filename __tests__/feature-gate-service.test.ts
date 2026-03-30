import { describe, expect, it, vi } from "vitest"
import {
  FeatureGateService,
  FeatureGateAccessError,
} from "@/lib/subscription/FeatureGateService"

describe("FeatureGateService", () => {
  it("allows feature when entitlement resolver grants access", async () => {
    const resolveForUserMock = vi.fn().mockResolvedValue({
      entitlement: {
        plans: ["pro"],
        status: "active",
        currentPeriodEnd: "2099-01-01T00:00:00.000Z",
        gracePeriodEnd: null,
      },
      hasAccess: true,
      message: "Access granted.",
    })

    const gate = new FeatureGateService({
      resolveForUser: resolveForUserMock,
    } as any)
    const decision = await gate.evaluateUserFeatureAccess("u1", "ai_chat")

    expect(decision.allowed).toBe(true)
    expect(decision.requiredPlan).toBe("AF Pro")
    expect(resolveForUserMock).toHaveBeenCalledWith("u1", "ai_chat")
  })

  it("throws typed error when user lacks entitlement", async () => {
    const gate = new FeatureGateService({
      resolveForUser: vi.fn().mockResolvedValue({
        entitlement: {
          plans: [],
          status: "none",
          currentPeriodEnd: null,
          gracePeriodEnd: null,
        },
        hasAccess: false,
        message: "Upgrade to access this feature.",
      }),
    } as any)

    await expect(gate.assertUserHasFeature("u1", "trade_analyzer")).rejects.toBeInstanceOf(
      FeatureGateAccessError
    )
  })

  it("returns past due messaging for locked features", async () => {
    const gate = new FeatureGateService({
      resolveForUser: vi.fn().mockResolvedValue({
        entitlement: {
          plans: ["pro"],
          status: "past_due",
          currentPeriodEnd: "2099-01-01T00:00:00.000Z",
          gracePeriodEnd: null,
        },
        hasAccess: false,
        message: "Subscription past due.",
      }),
    } as any)

    const decision = await gate.evaluateUserFeatureAccess("u1", "ai_waivers")
    expect(decision.allowed).toBe(false)
    expect(decision.message).toContain("past due")
  })
})
