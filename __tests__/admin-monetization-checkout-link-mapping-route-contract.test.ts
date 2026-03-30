import { beforeEach, describe, expect, it, vi } from "vitest"

const { requireAdminMock, getMonetizationCatalogMock, listStripeCheckoutLinkResolutionsMock } =
  vi.hoisted(() => ({
    requireAdminMock: vi.fn(),
    getMonetizationCatalogMock: vi.fn(),
    listStripeCheckoutLinkResolutionsMock: vi.fn(),
  }))

vi.mock("@/lib/adminAuth", () => ({
  requireAdmin: requireAdminMock,
}))

vi.mock("@/lib/monetization/catalog", () => ({
  getMonetizationCatalog: getMonetizationCatalogMock,
}))

vi.mock("@/lib/monetization/StripeCheckoutLinkRegistry", () => ({
  listStripeCheckoutLinkResolutions: listStripeCheckoutLinkResolutionsMock,
}))

describe("Admin checkout-link mapping diagnostics route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns auth gate response when admin check fails", async () => {
    requireAdminMock.mockResolvedValueOnce({
      ok: false,
      res: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    })

    const { GET } = await import("@/app/api/admin/monetization/checkout-link-mapping/route")
    const res = await GET()

    expect(res.status).toBe(401)
  })

  it("returns mapping coverage diagnostics for admins", async () => {
    requireAdminMock.mockResolvedValueOnce({ ok: true })
    getMonetizationCatalogMock.mockReturnValueOnce({
      subscriptions: [],
      tokenPacks: [],
      all: [
        {
          sku: "af_pro_monthly",
          type: "subscription",
          title: "AF Pro Monthly",
          description: "desc",
          amountUsd: 9.99,
          currency: "usd",
          interval: "month",
          tokenAmount: null,
          planFamily: "af_pro",
          stripePriceEnvVar: "unused",
        },
        {
          sku: "af_tokens_10",
          type: "token_pack",
          title: "AllFantasy AI Tokens (10)",
          description: "desc",
          amountUsd: 8.99,
          currency: "usd",
          interval: null,
          tokenAmount: 10,
          planFamily: null,
          stripePriceEnvVar: "unused",
        },
      ],
    })
    listStripeCheckoutLinkResolutionsMock.mockReturnValueOnce([
      {
        sku: "af_pro_monthly",
        purchaseType: "subscription",
        checkoutLinkEnvVar: "STRIPE_CHECKOUT_LINK_AF_PRO_MONTHLY",
        checkoutUrl: "https://buy.stripe.com/test_pro_monthly",
        configured: true,
      },
      {
        sku: "af_tokens_10",
        purchaseType: "tokens",
        checkoutLinkEnvVar: "STRIPE_CHECKOUT_LINK_AF_TOKENS_10",
        checkoutUrl: null,
        configured: false,
      },
    ])

    const { GET } = await import("@/app/api/admin/monetization/checkout-link-mapping/route")
    const res = await GET()

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      summary: {
        totalProducts: 2,
        configuredProducts: 1,
        missingProducts: 1,
      },
      missingSkus: ["af_tokens_10"],
      products: [
        {
          sku: "af_pro_monthly",
          title: "AF Pro Monthly",
          checkoutConfigured: true,
          expectedPurchaseType: "subscription",
          mappedPurchaseType: "subscription",
          checkoutDestination: "https://buy.stripe.com/test_pro_monthly",
          issue: null,
        },
        {
          sku: "af_tokens_10",
          title: "AllFantasy AI Tokens (10)",
          checkoutConfigured: false,
          expectedPurchaseType: "tokens",
          mappedPurchaseType: "tokens",
          issue: "checkout_link_missing_or_invalid",
        },
      ],
    })
  })
})
