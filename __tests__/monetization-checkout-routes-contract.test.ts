import { beforeEach, describe, expect, it, vi } from "vitest"
import { parseStripeCheckoutClientReferenceId } from "@/lib/monetization/StripeCheckoutLinkRegistry"

const getServerSessionMock = vi.hoisted(() => vi.fn())

vi.mock("next-auth", () => ({
  getServerSession: getServerSessionMock,
}))

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}))

describe("Monetization checkout routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getServerSessionMock.mockResolvedValue({ user: { id: "user-1", email: "user@test.dev" } })
    process.env.STRIPE_CHECKOUT_LINK_AF_PRO_MONTHLY = "https://buy.stripe.com/test_pro_monthly"
    process.env.STRIPE_CHECKOUT_LINK_AF_TOKENS_10 = "https://buy.stripe.com/test_tokens_10"
  })

  it("resolves subscription checkout link for valid subscription sku", async () => {
    const { POST } = await import("@/app/api/monetization/checkout/subscription/route")
    const req = new Request("http://localhost/api/monetization/checkout/subscription", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sku: "af_pro_monthly", returnPath: "/pricing?from=upgrade" }),
    })
    const res = await POST(req)

    expect(res.status).toBe(200)
    const payload = await res.json()
    expect(payload).toMatchObject({
      sku: "af_pro_monthly",
      purchaseType: "subscription",
    })
    const checkoutUrl = new URL(String(payload.url))
    expect(checkoutUrl.origin + checkoutUrl.pathname).toBe("https://buy.stripe.com/test_pro_monthly")
    expect(checkoutUrl.searchParams.get("prefilled_email")).toBe("user@test.dev")
    expect(checkoutUrl.searchParams.get("af_return_path")).toBe("/pricing?from=upgrade")
    const clientReference = parseStripeCheckoutClientReferenceId(
      checkoutUrl.searchParams.get("client_reference_id")
    )
    expect(clientReference).toMatchObject({
      userId: "user-1",
      sku: "af_pro_monthly",
      purchaseType: "subscription",
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

  it("resolves token checkout link for valid token pack sku", async () => {
    const { POST } = await import("@/app/api/monetization/checkout/tokens/route")
    const req = new Request("http://localhost/api/monetization/checkout/tokens", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sku: "af_tokens_10", returnPath: "https://malicious.example.com" }),
    })
    const res = await POST(req)

    expect(res.status).toBe(200)
    const payload = await res.json()
    expect(payload).toMatchObject({
      sku: "af_tokens_10",
      tokenAmount: 10,
      purchaseType: "tokens",
    })
    const checkoutUrl = new URL(String(payload.url))
    expect(checkoutUrl.origin + checkoutUrl.pathname).toBe("https://buy.stripe.com/test_tokens_10")
    const clientReference = parseStripeCheckoutClientReferenceId(
      checkoutUrl.searchParams.get("client_reference_id")
    )
    expect(clientReference).toMatchObject({
      sku: "af_tokens_10",
      userId: "user-1",
      purchaseType: "tokens",
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

  it("fails safely when checkout link mapping is missing", async () => {
    delete process.env.STRIPE_CHECKOUT_LINK_AF_PRO_MONTHLY
    const { POST } = await import("@/app/api/monetization/checkout/subscription/route")
    const req = new Request("http://localhost/api/monetization/checkout/subscription", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sku: "af_pro_monthly" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(503)
    await expect(res.json()).resolves.toMatchObject({
      error: expect.stringContaining("temporarily unavailable"),
    })
  })
})
