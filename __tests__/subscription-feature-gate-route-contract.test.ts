import { beforeEach, describe, expect, it, vi } from "vitest"

const getServerSessionMock = vi.fn()
const evaluateUserFeatureAccessMock = vi.fn()

vi.mock("next-auth", () => ({
  getServerSession: getServerSessionMock,
}))

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}))

vi.mock("@/lib/subscription/FeatureGateService", () => ({
  FeatureGateService: class {
    evaluateUserFeatureAccess = evaluateUserFeatureAccessMock
  },
  isFeatureGateAccessError: () => false,
}))

describe("POST /api/subscription/feature-gate contract", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getServerSessionMock.mockResolvedValue({ user: { id: "u1" } })
  })

  it("returns 401 when user is unauthenticated", async () => {
    getServerSessionMock.mockResolvedValueOnce(null)
    const { POST } = await import("@/app/api/subscription/feature-gate/route")
    const req = new Request("http://localhost/api/subscription/feature-gate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ featureId: "ai_chat" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it("returns 403 when feature is locked", async () => {
    evaluateUserFeatureAccessMock.mockResolvedValueOnce({
      allowed: false,
      message: "AF Pro is required.",
      requiredPlan: "AF Pro",
      upgradePath: "/upgrade?plan=pro&feature=ai_chat",
      entitlement: {
        plans: [],
        status: "none",
        currentPeriodEnd: null,
        gracePeriodEnd: null,
      },
    })
    const { POST } = await import("@/app/api/subscription/feature-gate/route")
    const req = new Request("http://localhost/api/subscription/feature-gate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ featureId: "ai_chat" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
    await expect(res.json()).resolves.toMatchObject({
      code: "feature_not_entitled",
      requiredPlan: "AF Pro",
    })
  })

  it("returns 200 when feature is allowed", async () => {
    evaluateUserFeatureAccessMock.mockResolvedValueOnce({
      allowed: true,
      message: "Access granted.",
      requiredPlan: "AF Pro",
      upgradePath: "/upgrade?plan=pro&feature=ai_chat",
      entitlement: {
        plans: ["pro"],
        status: "active",
        currentPeriodEnd: null,
        gracePeriodEnd: null,
      },
    })
    const { POST } = await import("@/app/api/subscription/feature-gate/route")
    const req = new Request("http://localhost/api/subscription/feature-gate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ featureId: "ai_chat" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      allowed: true,
      message: "Access granted.",
    })
  })
})
