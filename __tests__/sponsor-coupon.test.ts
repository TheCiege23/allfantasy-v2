/**
 * Sponsor coupon system tests — WassupFred
 *
 * Tests normalization, validation, discount math, and one-time-use enforcement.
 * These tests run against the pure lib functions (no DB calls for unit tests).
 * Integration tests for the webhook redemption flow are in the stripe-webhook suite.
 */

import { describe, expect, it, vi, beforeEach } from "vitest"
import {
  normalizeCouponCode,
  findSponsorCoupon,
  validateCouponForUser,
  calculateDiscountedAmounts,
  SPONSOR_COUPONS,
} from "@/lib/promotions/sponsorCoupon"
import {
  buildStripeCheckoutClientReferenceId,
  parseStripeCheckoutClientReferenceId,
  buildStripeCheckoutDestinationForSku,
} from "@/lib/monetization/StripeCheckoutLinkRegistry"

// ── Mock prisma for unit tests ─────────────────────────────────────────────

const { mockFindFirst, mockCreate, mockUpdate, mockUpdateMany, mockDeleteMany } = vi.hoisted(
  () => ({
    mockFindFirst: vi.fn(),
    mockCreate: vi.fn(),
    mockUpdate: vi.fn(),
    mockUpdateMany: vi.fn(),
    mockDeleteMany: vi.fn(),
  })
)

vi.mock("@/lib/prisma", () => ({
  prisma: {
    sponsorCouponRedemption: {
      findFirst: mockFindFirst,
      findMany: vi.fn(),
      create: mockCreate,
      update: mockUpdate,
      updateMany: mockUpdateMany,
      deleteMany: mockDeleteMany,
    },
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
  // Default: no redeemed redemption found
  mockFindFirst.mockResolvedValue(null)
})

// ── 1. Normalization ───────────────────────────────────────────────────────

describe("normalizeCouponCode", () => {
  it.each([
    ["WassupFred", "WASSUPFRED"],
    ["wassupfred", "WASSUPFRED"],
    ["WASSUPFRED", "WASSUPFRED"],
    [" WassupFred ", "WASSUPFRED"],
    [" wassup fred ", "WASSUPFRED"],
    ["wassup-fred", "WASSUPFRED"],
    ["wassup_fred", "WASSUPFRED"],
    ["WASSUP-FRED", "WASSUPFRED"],
    ["  Wassup Fred  ", "WASSUPFRED"],
  ])('normalizes "%s" → "%s"', (input, expected) => {
    expect(normalizeCouponCode(input)).toBe(expected)
  })

  it("normalizes empty string to empty string", () => {
    expect(normalizeCouponCode("")).toBe("")
  })

  it("normalizes unknown code that does not match any coupon", () => {
    expect(normalizeCouponCode("FREESTUFF")).toBe("FREESTUFF")
  })
})

// ── 2. Coupon config ───────────────────────────────────────────────────────

describe("SPONSOR_COUPONS config", () => {
  it("WASSUPFRED has 20% discount", () => {
    expect(SPONSOR_COUPONS.WASSUPFRED.discountPercent).toBe(20)
  })

  it("WASSUPFRED applies to both token_pack and subscription", () => {
    expect(SPONSOR_COUPONS.WASSUPFRED.appliesTo).toContain("token_pack")
    expect(SPONSOR_COUPONS.WASSUPFRED.appliesTo).toContain("subscription")
  })

  it("WASSUPFRED is active", () => {
    expect(SPONSOR_COUPONS.WASSUPFRED.active).toBe(true)
  })

  it("WASSUPFRED is not stackable", () => {
    expect(SPONSOR_COUPONS.WASSUPFRED.stackable).toBe(false)
  })

  it("WASSUPFRED is one-time use per user", () => {
    expect(SPONSOR_COUPONS.WASSUPFRED.oneTimeUsePerUser).toBe(true)
  })
})

// ── 3. findSponsorCoupon ───────────────────────────────────────────────────

describe("findSponsorCoupon", () => {
  it("finds WASSUPFRED by normalized code", () => {
    const coupon = findSponsorCoupon("WASSUPFRED")
    expect(coupon).not.toBeNull()
    expect(coupon?.normalizedCode).toBe("WASSUPFRED")
  })

  it("returns null for unknown code", () => {
    expect(findSponsorCoupon("UNKNOWNCODE")).toBeNull()
  })

  it("returns null for unnormalized code", () => {
    // findSponsorCoupon expects already-normalized input
    expect(findSponsorCoupon("WassupFred")).toBeNull()
    expect(findSponsorCoupon("wassupfred")).toBeNull()
  })
})

// ── 4. validateCouponForUser ───────────────────────────────────────────────

describe("validateCouponForUser", () => {
  it("validates WassupFred for token_pack when not yet used", async () => {
    const result = await validateCouponForUser({
      userId: "user_1",
      rawCode: "WassupFred",
      productType: "token_pack",
    })
    expect(result.valid).toBe(true)
    if (result.valid) {
      expect(result.normalizedCode).toBe("WASSUPFRED")
      expect(result.discountPercent).toBe(20)
    }
  })

  it("validates WASSUPFRED for subscription when not yet used", async () => {
    const result = await validateCouponForUser({
      userId: "user_1",
      rawCode: "WASSUPFRED",
      productType: "subscription",
    })
    expect(result.valid).toBe(true)
  })

  it('validates " wassup fred " (with spaces) for token_pack', async () => {
    const result = await validateCouponForUser({
      userId: "user_1",
      rawCode: " wassup fred ",
      productType: "token_pack",
    })
    expect(result.valid).toBe(true)
  })

  it("validates wassup-fred for token_pack", async () => {
    const result = await validateCouponForUser({
      userId: "user_1",
      rawCode: "wassup-fred",
      productType: "token_pack",
    })
    expect(result.valid).toBe(true)
  })

  it("returns requires_auth when userId is null", async () => {
    const result = await validateCouponForUser({
      userId: null,
      rawCode: "WassupFred",
      productType: "token_pack",
    })
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.reason).toBe("requires_auth")
    }
  })

  it("returns not_found for invalid code", async () => {
    const result = await validateCouponForUser({
      userId: "user_1",
      rawCode: "FAKECODE",
      productType: "token_pack",
    })
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.reason).toBe("not_found")
    }
  })

  it("returns already_used when user has redeemed code", async () => {
    mockFindFirst.mockResolvedValue({ id: "redemption_1" })

    const result = await validateCouponForUser({
      userId: "user_1",
      rawCode: "WassupFred",
      productType: "token_pack",
    })
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.reason).toBe("already_used")
      expect(result.alreadyUsed).toBe(true)
    }
  })

  it("code used on token_pack blocks later subscription use", async () => {
    // Simulate: user already redeemed on a token_pack (stored as redeemed row)
    mockFindFirst.mockResolvedValue({ id: "token_redemption_1" })

    const subResult = await validateCouponForUser({
      userId: "user_1",
      rawCode: "WassupFred",
      productType: "subscription",
    })
    expect(subResult.valid).toBe(false)
    if (!subResult.valid) {
      expect(subResult.reason).toBe("already_used")
    }
  })

  it("code used on subscription blocks later token_pack use", async () => {
    mockFindFirst.mockResolvedValue({ id: "sub_redemption_1" })

    const tokenResult = await validateCouponForUser({
      userId: "user_1",
      rawCode: "WASSUPFRED",
      productType: "token_pack",
    })
    expect(tokenResult.valid).toBe(false)
  })
})

// ── 5. calculateDiscountedAmounts ──────────────────────────────────────────

describe("calculateDiscountedAmounts", () => {
  it("gives exactly 20% off $4.99 token pack (499 cents)", () => {
    const { discountAmountCents, totalCents } = calculateDiscountedAmounts(499, 20)
    expect(discountAmountCents).toBe(99) // floor(499 * 0.20) = floor(99.8) = 99
    expect(totalCents).toBe(400)
  })

  it("gives exactly 20% off $8.99 token pack (899 cents)", () => {
    const { discountAmountCents, totalCents } = calculateDiscountedAmounts(899, 20)
    expect(discountAmountCents).toBe(179) // floor(899 * 0.20) = floor(179.8) = 179
    expect(totalCents).toBe(720)
  })

  it("gives exactly 20% off $19.99 token pack (1999 cents)", () => {
    const { discountAmountCents, totalCents } = calculateDiscountedAmounts(1999, 20)
    expect(discountAmountCents).toBe(399) // floor(1999 * 0.20) = floor(399.8) = 399
    expect(totalCents).toBe(1600)
  })

  it("gives exactly 20% off $9.99 AF Pro monthly (999 cents)", () => {
    const { discountAmountCents, totalCents } = calculateDiscountedAmounts(999, 20)
    expect(discountAmountCents).toBe(199) // floor(999 * 0.20) = floor(199.8) = 199
    expect(totalCents).toBe(800)
  })

  it("gives exactly 20% off $99.99 AF Pro yearly (9999 cents)", () => {
    const { discountAmountCents, totalCents } = calculateDiscountedAmounts(9999, 20)
    expect(discountAmountCents).toBe(1999) // floor(9999 * 0.20) = floor(1999.8) = 1999
    expect(totalCents).toBe(8000)
  })

  it("never goes negative", () => {
    const { totalCents } = calculateDiscountedAmounts(0, 20)
    expect(totalCents).toBeGreaterThanOrEqual(0)
  })

  it("rounds down discount to avoid charging too little", () => {
    // $4.99 at 20% → 99.8 cents discount → floor to 99, not 100
    const { discountAmountCents } = calculateDiscountedAmounts(499, 20)
    expect(discountAmountCents).toBe(99)
  })
})

// ── 6. client_reference_id coupon encoding ────────────────────────────────

describe("StripeCheckoutLinkRegistry coupon encoding", () => {
  it("encodes coupon code into client_reference_id", () => {
    const ref = buildStripeCheckoutClientReferenceId({
      userId: "user_123",
      sku: "af_tokens_5",
      purchaseType: "tokens",
      couponCode: "WASSUPFRED",
    })
    expect(typeof ref).toBe("string")
    expect(ref.startsWith("af1_")).toBe(true)

    const parsed = parseStripeCheckoutClientReferenceId(ref)
    expect(parsed?.couponCode).toBe("WASSUPFRED")
  })

  it("parses null couponCode when no coupon was applied", () => {
    const ref = buildStripeCheckoutClientReferenceId({
      userId: "user_123",
      sku: "af_pro_monthly",
      purchaseType: "subscription",
    })
    const parsed = parseStripeCheckoutClientReferenceId(ref)
    expect(parsed?.couponCode).toBeNull()
  })

  it("round-trips userId/sku/purchaseType unchanged", () => {
    const ref = buildStripeCheckoutClientReferenceId({
      userId: "user_abc",
      sku: "af_commissioner_yearly",
      purchaseType: "subscription",
      couponCode: "WASSUPFRED",
    })
    const parsed = parseStripeCheckoutClientReferenceId(ref)
    expect(parsed?.userId).toBe("user_abc")
    expect(parsed?.sku).toBe("af_commissioner_yearly")
    expect(parsed?.purchaseType).toBe("subscription")
    expect(parsed?.couponCode).toBe("WASSUPFRED")
  })
})

// ── 7. buildStripeCheckoutDestinationForSku URL encoding ──────────────────

describe("buildStripeCheckoutDestinationForSku with coupon", () => {
  it("appends prefilled_promo_code when couponCode is provided", () => {
    const mockEnv = {
      STRIPE_CHECKOUT_LINK_AF_TOKENS_5: "https://buy.stripe.com/test_link_5",
    }
    const result = buildStripeCheckoutDestinationForSku({
      sku: "af_tokens_5",
      userId: "user_1",
      couponCode: "WASSUPFRED",
      env: mockEnv,
    })
    expect(result).not.toBeNull()
    const url = new URL(result!.url)
    expect(url.searchParams.get("prefilled_promo_code")).toBe("WASSUPFRED")
  })

  it("does NOT append prefilled_promo_code when no coupon", () => {
    const mockEnv = {
      STRIPE_CHECKOUT_LINK_AF_TOKENS_5: "https://buy.stripe.com/test_link_5",
    }
    const result = buildStripeCheckoutDestinationForSku({
      sku: "af_tokens_5",
      userId: "user_1",
      env: mockEnv,
    })
    const url = new URL(result!.url)
    expect(url.searchParams.has("prefilled_promo_code")).toBe(false)
  })
})
