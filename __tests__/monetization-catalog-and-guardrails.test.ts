import { describe, expect, it } from "vitest"

import {
  assertNoLeagueSettlementIntent,
  MonetizationComplianceError,
} from "@/lib/monetization/compliance-guardrails"
import {
  getMonetizationCatalog,
  getMonetizationCatalogItemBySku,
  getMonetizationStripePriceIdForSku,
} from "@/lib/monetization/catalog"

describe("Monetization catalog", () => {
  it("contains required subscription and token SKUs", () => {
    const catalog = getMonetizationCatalog()

    expect(catalog.subscriptions.length).toBe(8)
    expect(catalog.tokenPacks.length).toBe(3)
    expect(catalog.all.length).toBe(11)

    expect(getMonetizationCatalogItemBySku("af_all_access_monthly")?.amountUsd).toBe(19.99)
    expect(getMonetizationCatalogItemBySku("af_tokens_25")?.tokenAmount).toBe(25)
  })

  it("resolves Stripe price IDs by env var map", () => {
    const priceId = getMonetizationStripePriceIdForSku("af_pro_monthly", {
      STRIPE_PRICE_AF_PRO_MONTHLY: "price_123",
    } as NodeJS.ProcessEnv)
    expect(priceId).toBe("price_123")
  })
})

describe("Monetization compliance guardrails", () => {
  it("blocks dues/payout/prize settlement intents", () => {
    expect(() => assertNoLeagueSettlementIntent("first_bracket_fee")).toThrow(MonetizationComplianceError)
    expect(() => assertNoLeagueSettlementIntent("payout_distribution")).toThrow(MonetizationComplianceError)
    expect(() => assertNoLeagueSettlementIntent("prize_pool_setup")).toThrow(MonetizationComplianceError)
  })

  it("allows subscription and token purchase intents", () => {
    expect(() => assertNoLeagueSettlementIntent("af_pro_monthly")).not.toThrow()
    expect(() => assertNoLeagueSettlementIntent("af_tokens_10")).not.toThrow()
    expect(() =>
      assertNoLeagueSettlementIntent("donation", { purchaseType: "support_donation" })
    ).not.toThrow()
  })
})
