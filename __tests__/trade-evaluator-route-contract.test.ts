import { beforeEach, describe, expect, it, vi } from "vitest"

const getServerSessionMock = vi.fn()
const assertLeagueMemberMock = vi.fn()
const requireFeatureEntitlementMock = vi.fn()
const isToolTradeAnalyzerEnabledMock = vi.fn()
const checkAiRateLimitMock = vi.fn()
const getAiActionConfigMock = vi.fn()
const getCachedResponseMock = vi.fn()
const setCachedResponseMock = vi.fn()
const buildCacheKeyMock = vi.fn()

vi.mock("next-auth", () => ({
  getServerSession: getServerSessionMock,
}))

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}))

vi.mock("@/lib/feature-toggle", () => ({
  isToolTradeAnalyzerEnabled: isToolTradeAnalyzerEnabledMock,
}))

vi.mock("@/lib/league-access", () => ({
  assertLeagueMember: assertLeagueMemberMock,
}))

vi.mock("@/lib/subscription/entitlement-middleware", () => ({
  requireFeatureEntitlement: requireFeatureEntitlementMock,
}))

vi.mock("@/lib/telemetry/usage", () => ({
  withApiUsage: () => (handler: (req: Request) => Promise<Response>) => handler,
}))

vi.mock("@/lib/ai-protection", () => ({
  checkAiRateLimit: checkAiRateLimitMock,
  getAiActionConfig: getAiActionConfigMock,
  getCachedResponse: getCachedResponseMock,
  setCachedResponse: setCachedResponseMock,
  buildCacheKey: buildCacheKeyMock,
  consumeRateLimit: vi.fn(),
}))

function buildValidTradeEvaluatorBody(overrides?: Record<string, unknown>) {
  return {
    trade_id: "trade-1",
    sender: {
      manager_name: "Team A",
      gives_players: ["Player A"],
      gives_picks: [],
      gives_faab: 0,
    },
    receiver: {
      manager_name: "Team B",
      gives_players: ["Player B"],
      gives_picks: [],
      gives_faab: 0,
    },
    league: {
      format: "dynasty",
      sport: "NFL",
      scoring_summary: "PPR",
      qb_format: "sf",
    },
    ...overrides,
  }
}

describe("POST /api/trade-evaluator contract", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isToolTradeAnalyzerEnabledMock.mockResolvedValue(true)
    getAiActionConfigMock.mockReturnValue({
      maxRequests: 50,
      windowMs: 60_000,
      cacheTtlMs: 0,
    })
    checkAiRateLimitMock.mockReturnValue({
      allowed: true,
      retryAfterSec: 0,
      remaining: 49,
    })
    getCachedResponseMock.mockReturnValue(null)
    buildCacheKeyMock.mockReturnValue("trade-evaluator-cache-key")
    setCachedResponseMock.mockImplementation(() => {})
    getServerSessionMock.mockResolvedValue({ user: { id: "user-1" } })
    requireFeatureEntitlementMock.mockResolvedValue({
      ok: true,
      decision: {},
      tokenSpend: null,
      tokenPreview: null,
    })
  })

  it("returns 401 when unauthenticated", async () => {
    getServerSessionMock.mockResolvedValueOnce(null)
    const { POST } = await import("@/app/api/trade-evaluator/route")
    const req = new Request("http://localhost/api/trade-evaluator", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildValidTradeEvaluatorBody()),
    })

    const res = await POST(req as any)
    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toEqual({ error: "Unauthorized" })
  })

  it("returns 403 when user is not a member of league", async () => {
    assertLeagueMemberMock.mockRejectedValueOnce(new Error("Forbidden"))
    const { POST } = await import("@/app/api/trade-evaluator/route")
    const req = new Request("http://localhost/api/trade-evaluator", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        buildValidTradeEvaluatorBody({
          league_id: "league-1",
        })
      ),
    })

    const res = await POST(req as any)
    expect(res.status).toBe(403)
    await expect(res.json()).resolves.toEqual({ error: "Forbidden" })
    expect(requireFeatureEntitlementMock).not.toHaveBeenCalled()
  })

  it("returns 409 when token confirmation is required", async () => {
    requireFeatureEntitlementMock.mockResolvedValueOnce({
      ok: false,
      response: new Response(
        JSON.stringify({
          code: "token_confirmation_required",
          message: "Use 3 tokens to unlock this request once.",
        }),
        {
          status: 409,
          headers: { "Content-Type": "application/json" },
        }
      ),
    })

    const { POST } = await import("@/app/api/trade-evaluator/route")
    const req = new Request("http://localhost/api/trade-evaluator", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildValidTradeEvaluatorBody()),
    })

    const res = await POST(req as any)
    expect(res.status).toBe(409)
    await expect(res.json()).resolves.toMatchObject({
      code: "token_confirmation_required",
    })
  })

  it("returns 402 when token balance is insufficient", async () => {
    requireFeatureEntitlementMock.mockResolvedValueOnce({
      ok: false,
      response: new Response(
        JSON.stringify({
          code: "insufficient_token_balance",
          message: "Need 3 tokens for this one-time unlock.",
        }),
        {
          status: 402,
          headers: { "Content-Type": "application/json" },
        }
      ),
    })

    const { POST } = await import("@/app/api/trade-evaluator/route")
    const req = new Request("http://localhost/api/trade-evaluator", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildValidTradeEvaluatorBody()),
    })

    const res = await POST(req as any)
    expect(res.status).toBe(402)
    await expect(res.json()).resolves.toMatchObject({
      code: "insufficient_token_balance",
    })
  })

  it("returns 200 with cached payload and tokenSpend metadata on gated success", async () => {
    getAiActionConfigMock.mockReturnValueOnce({
      maxRequests: 50,
      windowMs: 60_000,
      cacheTtlMs: 60_000,
    })
    getCachedResponseMock.mockReturnValueOnce({
      success: true,
      evaluation: { verdict: { overall: "FAIR" } },
      schemaValid: true,
    })
    requireFeatureEntitlementMock.mockResolvedValueOnce({
      ok: true,
      decision: {},
      tokenSpend: {
        id: "ledger-123",
        balanceAfter: 14,
      },
      tokenPreview: {
        ruleCode: "ai_trade_analyzer_full_review",
        tokenCost: 3,
      },
    })

    const { POST } = await import("@/app/api/trade-evaluator/route")
    const req = new Request("http://localhost/api/trade-evaluator", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        buildValidTradeEvaluatorBody({
          confirmTokenSpend: true,
        })
      ),
    })

    const res = await POST(req as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.schemaValid).toBe(true)
    expect(body.evaluation?.verdict?.overall).toBe("FAIR")
    expect(body.tokenSpend).toMatchObject({
      ruleCode: "ai_trade_analyzer_full_review",
      tokenCost: 3,
      balanceAfter: 14,
      ledgerId: "ledger-123",
    })
    expect(requireFeatureEntitlementMock).toHaveBeenCalledWith(
      expect.objectContaining({
        featureId: "trade_analyzer",
        allowTokenFallback: true,
        confirmTokenSpend: true,
        tokenRuleCode: "ai_trade_analyzer_full_review",
      })
    )
  })
})
