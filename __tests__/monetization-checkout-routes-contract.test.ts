import { beforeEach, describe, expect, it, vi } from "vitest"

const getServerSessionMock = vi.hoisted(() => vi.fn())
const checkoutCreateMock = vi.hoisted(() => vi.fn())
const getBaseUrlMock = vi.hoisted(() => vi.fn(() => "http://localhost:3000"))
const getStripeClientMock = vi.hoisted(() =>
  vi.fn(() => ({
    checkout: {
      sessions: {
        create: checkoutCreateMock,
      },
    },
  }))
)

vi.mock("next-auth", () => ({
  getServerSession: getServerSessionMock,
}))

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}))

vi.mock("@/lib/get-base-url", () => ({
  getBaseUrl: getBaseUrlMock,
}))

vi.mock("@/lib/stripe-client", () => ({
  getStripeClient: getStripeClientMock,
}))

describe("Monetization checkout routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getServerSessionMock.mockResolvedValue({ user: { id: "user-1", email: "user@test.dev" } })
    checkoutCreateMock.mockResolvedValue({
      id: "cs_test_123",
      url: "https://checkout.stripe.test/session/cs_test_123",
    })
    process.env.STRIPE_PRICE_AF_PRO_MONTHLY = "price_pro_monthly_123"
    process.env.STRIPE_PRICE_AF_TOKENS_10 = "price_tokens_10_123"
  })

  it("creates subscription checkout for valid subscription sku", async () => {
    const { POST } = await import("@/app/api/monetization/checkout/subscription/route")
    const req = new Request("http://localhost/api/monetization/checkout/subscription", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sku: "af_pro_monthly", returnPath: "/pricing?from=upgrade" }),
    })
    const res = await POST(req)

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      url: "https://checkout.stripe.test/session/cs_test_123",
      sessionId: "cs_test_123",
      sku: "af_pro_monthly",
    })

    expect(checkoutCreateMock).toHaveBeenCalledTimes(1)
    const checkoutArg = checkoutCreateMock.mock.calls[0][0]
    expect(checkoutArg.mode).toBe("subscription")
    expect(checkoutArg.line_items[0].price).toBe("price_pro_monthly_123")
    expect(checkoutArg.success_url).toContain("/pricing?from=upgrade&checkout=success")
    expect(checkoutArg.metadata).toMatchObject({
      purchaseType: "subscription",
      sku: "af_pro_monthly",
      userId: "user-1",
    })
  })

  it("rejects token sku on subscription checkout route", async () => {
    const { POST } = await import("@/app/api/monetization/checkout/subscription/route")
    const req = new Request("http://localhost/api/monetization/checkout/subscription", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sku: "af_tokens_10" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({ error: "Invalid subscription sku" })
  })

  it("creates token checkout for valid token pack sku", async () => {
    const { POST } = await import("@/app/api/monetization/checkout/tokens/route")
    const req = new Request("http://localhost/api/monetization/checkout/tokens", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sku: "af_tokens_10", returnPath: "https://malicious.example.com" }),
    })
    const res = await POST(req)

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      url: "https://checkout.stripe.test/session/cs_test_123",
      sessionId: "cs_test_123",
      sku: "af_tokens_10",
      tokenAmount: 10,
    })

    expect(checkoutCreateMock).toHaveBeenCalledTimes(1)
    const checkoutArg = checkoutCreateMock.mock.calls[0][0]
    expect(checkoutArg.mode).toBe("payment")
    expect(checkoutArg.line_items[0].price).toBe("price_tokens_10_123")
    expect(checkoutArg.success_url).toBe("http://localhost:3000/pricing?checkout=success")
    expect(checkoutArg.metadata).toMatchObject({
      purchaseType: "tokens",
      sku: "af_tokens_10",
      tokenAmount: "10",
      userId: "user-1",
    })
  })

  it("rejects subscription sku on token checkout route", async () => {
    const { POST } = await import("@/app/api/monetization/checkout/tokens/route")
    const req = new Request("http://localhost/api/monetization/checkout/tokens", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sku: "af_pro_monthly" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({ error: "Invalid token pack sku" })
  })

  it("rejects prohibited intent-like sku via compliance guardrail", async () => {
    const { POST } = await import("@/app/api/monetization/checkout/tokens/route")
    const req = new Request("http://localhost/api/monetization/checkout/tokens", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sku: "dues_pack" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({
      code: "in_app_dues_not_allowed",
    })
  })

  it("rejects payout and prize_pool settlement intents", async () => {
    const { POST: postSubscription } = await import("@/app/api/monetization/checkout/subscription/route")
    const payoutReq = new Request("http://localhost/api/monetization/checkout/subscription", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sku: "payout_distribution" }),
    })
    const payoutRes = await postSubscription(payoutReq)
    expect(payoutRes.status).toBe(400)
    await expect(payoutRes.json()).resolves.toMatchObject({
      code: "in_app_payout_not_allowed",
    })

    const { POST: postTokens } = await import("@/app/api/monetization/checkout/tokens/route")
    const prizeReq = new Request("http://localhost/api/monetization/checkout/tokens", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sku: "prize_pool_setup" }),
    })
    const prizeRes = await postTokens(prizeReq)
    expect(prizeRes.status).toBe(400)
    await expect(prizeRes.json()).resolves.toMatchObject({
      code: "in_app_prize_pool_not_allowed",
    })
  })
})
