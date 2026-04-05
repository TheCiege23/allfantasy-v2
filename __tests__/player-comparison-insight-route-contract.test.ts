import { beforeEach, describe, expect, it, vi } from "vitest"

import { createMockNextRequest } from "@/__tests__/helpers/createMockNextRequest"
const getServerSessionMock = vi.fn()
const requireFeatureEntitlementMock = vi.fn()

vi.mock("next-auth", () => ({
  getServerSession: getServerSessionMock,
}))

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}))

vi.mock("@/lib/provider-config", () => ({
  isDeepSeekAvailable: vi.fn(() => false),
  isXaiAvailable: vi.fn(() => false),
  isOpenAIAvailable: vi.fn(() => false),
}))

vi.mock("@/lib/deepseek-client", () => ({
  deepseekChat: vi.fn(),
}))

vi.mock("@/lib/xai-client", () => ({
  xaiChatJson: vi.fn(),
  parseTextFromXaiChatCompletion: vi.fn(),
}))

vi.mock("@/lib/openai-client", () => ({
  openaiChatText: vi.fn(),
}))

vi.mock("@/lib/subscription/entitlement-middleware", () => ({
  requireFeatureEntitlement: requireFeatureEntitlementMock,
}))

describe("POST /api/player-comparison/insight contract", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireFeatureEntitlementMock.mockResolvedValue({
      ok: true,
      decision: {},
      tokenSpend: null,
      tokenPreview: null,
    })
  })

  it("returns 401 when unauthenticated", async () => {
    getServerSessionMock.mockResolvedValueOnce(null)
    const { POST } = await import("@/app/api/player-comparison/insight/route")
    const req = createMockNextRequest("http://localhost/api/player-comparison/insight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ players: ["A", "B"], summaryLines: ["line"] }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it("returns 403 when feature gate denies access", async () => {
    getServerSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } })
    requireFeatureEntitlementMock.mockResolvedValueOnce({
      ok: false,
      response: new Response(
        JSON.stringify({
          error: "Premium feature",
          code: "feature_not_entitled",
          message: "AF Pro is required.",
          requiredPlan: "AF Pro",
          upgradePath: "/upgrade?plan=pro",
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      ),
    })
    const { POST } = await import("@/app/api/player-comparison/insight/route")
    const req = createMockNextRequest("http://localhost/api/player-comparison/insight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ players: ["A", "B"], summaryLines: ["line"] }),
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
    await expect(res.json()).resolves.toMatchObject({
      error: "Premium feature",
      requiredPlan: "AF Pro",
    })
  })

  it("returns deterministic fallback recommendation when providers unavailable", async () => {
    getServerSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } })
    const { POST } = await import("@/app/api/player-comparison/insight/route")
    const req = createMockNextRequest("http://localhost/api/player-comparison/insight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        players: ["Player A", "Player B"],
        summaryLines: ["Player A has higher dynasty value."],
        sport: "NFL",
        scoringFormat: "ppr",
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      finalRecommendation: expect.stringContaining("Player A"),
      providerStatus: {
        deepseek: false,
        grok: false,
        openai: false,
      },
    })
  })
})
