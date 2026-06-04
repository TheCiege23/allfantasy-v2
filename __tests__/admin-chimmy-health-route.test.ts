/**
 * Contract tests for GET /api/admin/chimmy/health
 *
 * Covers:
 *   - 401 when unauthenticated
 *   - Non-admin user gets 403 (no data leak)
 *   - Admin gets full health shape with stripeWebhookHealth + tokenLedgerHealth
 *   - Health shape is ok: false but still returns HTTP 200 when sub-queries degrade
 */

import { beforeEach, describe, expect, it, vi } from "vitest"
import { createMockNextRequest } from "@/__tests__/helpers/createMockNextRequest"

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const requireAdminMock = vi.hoisted(() => vi.fn())
const getStripeWebhookHealthMock = vi.hoisted(() => vi.fn())
const getTokenLedgerHealthMock = vi.hoisted(() => vi.fn())

// Chimmy-specific health query mocks (names match lib/chimmy-context/telemetry/healthQueries.ts)
const getRunVolumeMock = vi.hoisted(() => vi.fn())
const getProviderErrorRateMock = vi.hoisted(() => vi.fn())
const getCacheHitRatioMock = vi.hoisted(() => vi.fn())
const getAvgPromptSizeMock = vi.hoisted(() => vi.fn())
const getTopRisksFrequencyMock = vi.hoisted(() => vi.fn())
const getFeedbackSummaryMock = vi.hoisted(() => vi.fn())
const getCardSentimentMock = vi.hoisted(() => vi.fn())

vi.mock("@/lib/adminAuth", () => ({
  requireAdmin: requireAdminMock,
}))

vi.mock("@/lib/admin/paymentHealthQueries", () => ({
  getStripeWebhookHealth: getStripeWebhookHealthMock,
  getTokenLedgerHealth: getTokenLedgerHealthMock,
}))

// Route imports chimmy health queries from @/lib/chimmy-context/telemetry/healthQueries
vi.mock("@/lib/chimmy-context/telemetry/healthQueries", () => ({
  getRunVolume: getRunVolumeMock,
  getProviderErrorRate: getProviderErrorRateMock,
  getCacheHitRatio: getCacheHitRatioMock,
  getAvgPromptSize: getAvgPromptSizeMock,
  getTopRisksFrequency: getTopRisksFrequencyMock,
  getFeedbackSummary: getFeedbackSummaryMock,
  getCardSentiment: getCardSentimentMock,
}))

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const MOCK_STRIPE_HEALTH = {
  ok: true,
  errorCount: 0,
  tokenErrorCount: 0,
  oldestUnresolvedError: null,
}

const MOCK_TOKEN_LEDGER_HEALTH = {
  ok: true,
  purchaseGrantsInWindow: 3,
  spendEntriesInWindow: 47,
  usersWithBalance: 12,
}

const MOCK_RUN_VOLUME = { requestsInShortWindow: 42, requestsInLongWindow: 315 }
const MOCK_ERROR_RATE = { errorRateShortWindow: 0.02, errorRateLongWindow: 0.03 }
const MOCK_CACHE_HIT = { cacheHitRatioShortWindow: 0.85, cacheHitRatioLongWindow: 0.82 }
const MOCK_PROMPT_SIZE = { avgPromptSizeShortWindow: 1200, avgPromptSizeLongWindow: 1150 }
const MOCK_TOP_RISKS = { risks: [] }
const MOCK_FEEDBACK = { thumbsUp: 10, thumbsDown: 2 }
const MOCK_CARD_SENTIMENT = { positive: 8, negative: 1, neutral: 3 }

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("GET /api/admin/chimmy/health", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireAdminMock.mockResolvedValue({ ok: true, user: { id: "admin-1", role: "admin" } })

    // Payment health defaults
    getStripeWebhookHealthMock.mockResolvedValue(MOCK_STRIPE_HEALTH)
    getTokenLedgerHealthMock.mockResolvedValue(MOCK_TOKEN_LEDGER_HEALTH)

    // Chimmy health defaults
    getRunVolumeMock.mockResolvedValue(MOCK_RUN_VOLUME)
    getProviderErrorRateMock.mockResolvedValue(MOCK_ERROR_RATE)
    getCacheHitRatioMock.mockResolvedValue(MOCK_CACHE_HIT)
    getAvgPromptSizeMock.mockResolvedValue(MOCK_PROMPT_SIZE)
    getTopRisksFrequencyMock.mockResolvedValue(MOCK_TOP_RISKS)
    getFeedbackSummaryMock.mockResolvedValue(MOCK_FEEDBACK)
    getCardSentimentMock.mockResolvedValue(MOCK_CARD_SENTIMENT)
  })

  it("returns 401 when unauthenticated", async () => {
    requireAdminMock.mockResolvedValue({
      ok: false,
      res: Response.json({ error: "Unauthorized" }, { status: 401 }),
    })
    const { GET } = await import("@/app/api/admin/chimmy/health/route")
    const req = createMockNextRequest("http://localhost/api/admin/chimmy/health")
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it("returns 403 for non-admin user (no data leak)", async () => {
    requireAdminMock.mockResolvedValue({
      ok: false,
      res: Response.json({ error: "Forbidden" }, { status: 403 }),
    })
    const { GET } = await import("@/app/api/admin/chimmy/health/route")
    const req = createMockNextRequest("http://localhost/api/admin/chimmy/health")
    const res = await GET(req)
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe("Forbidden")
    // No health data should be leaked to non-admin users
    expect(body.stripeWebhookHealth).toBeUndefined()
    expect(body.tokenLedgerHealth).toBeUndefined()
    expect(getStripeWebhookHealthMock).not.toHaveBeenCalled()
    expect(getTokenLedgerHealthMock).not.toHaveBeenCalled()
  })

  it("returns full health shape with stripeWebhookHealth and tokenLedgerHealth for admin user", async () => {
    const { GET } = await import("@/app/api/admin/chimmy/health/route")
    const req = createMockNextRequest("http://localhost/api/admin/chimmy/health")
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()

    expect(body.ok).toBe(true)
    expect(body.accepted).toBe(true)
    expect(body.generatedAt).toBeDefined()
    expect(body.windows).toMatchObject({ short: expect.any(Number), long: expect.any(Number) })

    // Payment & token health fields must be present
    expect(body.stripeWebhookHealth).toMatchObject({
      ok: true,
      errorCount: 0,
      tokenErrorCount: 0,
      oldestUnresolvedError: null,
    })
    expect(body.tokenLedgerHealth).toMatchObject({
      ok: true,
      purchaseGrantsInWindow: 3,
      spendEntriesInWindow: 47,
      usersWithBalance: 12,
    })
  })

  it("returns HTTP 200 with ok:false when stripe webhook health is degraded", async () => {
    getStripeWebhookHealthMock.mockResolvedValue({
      ok: false,
      errorCount: 3,
      tokenErrorCount: 1,
      oldestUnresolvedError: {
        eventId: "evt_bad",
        purchaseType: "tokens",
        processedAt: null,
        errorSnippet: "token_grant_skipped:missing_context",
      },
    })
    const { GET } = await import("@/app/api/admin/chimmy/health/route")
    const req = createMockNextRequest("http://localhost/api/admin/chimmy/health")
    const res = await GET(req)

    // Still HTTP 200 — health endpoint never crashes
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.stripeWebhookHealth.ok).toBe(false)
    expect(body.stripeWebhookHealth.errorCount).toBe(3)
    expect(body.stripeWebhookHealth.oldestUnresolvedError.eventId).toBe("evt_bad")
  })

  it("both payment health queries are called with the long window hours", async () => {
    const { GET } = await import("@/app/api/admin/chimmy/health/route")
    const req = createMockNextRequest("http://localhost/api/admin/chimmy/health")
    await GET(req)

    expect(getStripeWebhookHealthMock).toHaveBeenCalledWith(expect.any(Number))
    expect(getTokenLedgerHealthMock).toHaveBeenCalledWith(expect.any(Number))
  })
})
