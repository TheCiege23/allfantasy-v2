/**
 * WassupFred sponsor coupon system.
 *
 * Business rules:
 * - Normalized code: WASSUPFRED (case-insensitive, trim, remove spaces/hyphens)
 * - Discount: 20% off first purchase (token pack OR subscription)
 * - One-time use per user total (not per product)
 * - Applied via Stripe prefilled_promo_code param on Payment Links
 * - Pending redemption is created when checkout starts; marked redeemed by webhook
 * - Abandoned checkouts leave pending rows that are cleaned up / ignored on next validate
 */

import { prisma } from "@/lib/prisma"

// ── Config ────────────────────────────────────────────────────────────────────

export const SPONSOR_COUPONS = {
  WASSUPFRED: {
    normalizedCode: "WASSUPFRED",
    displayCode: "WassupFred",
    sponsorName: "WassupFred",
    campaignName: "sponsor_world_cup_launch",
    discountPercent: 20,
    /** Stripe promotion code name to pass as ?prefilled_promo_code= on payment links */
    stripePrefillCode: "WASSUPFRED",
    /** Only first purchase (token pack or subscription). */
    appliesTo: ["token_pack", "subscription"] as const,
    oneTimeUsePerUser: true,
    stackable: false,
    active: true,
  },
} as const satisfies Record<string, SponsorCouponConfig>

export type SponsorCouponConfig = {
  normalizedCode: string
  displayCode: string
  sponsorName: string
  campaignName: string
  discountPercent: number
  stripePrefillCode: string
  appliesTo: readonly string[]
  oneTimeUsePerUser: boolean
  stackable: boolean
  active: boolean
}

export type CouponAppliesTo = "token_pack" | "subscription"

// ── Normalization ──────────────────────────────────────────────────────────────

/**
 * Normalize a user-typed coupon code to its canonical form.
 * Trims whitespace, uppercases, removes internal spaces and hyphens/underscores.
 *
 * Examples that all normalize to "WASSUPFRED":
 *   "WassupFred", "wassupfred", " Wassup Fred ", "wassup-fred", "WASSUP_FRED"
 */
export function normalizeCouponCode(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[\s\-_]+/g, "")
}

// ── Lookup ─────────────────────────────────────────────────────────────────────

export function findSponsorCoupon(normalizedCode: string): SponsorCouponConfig | null {
  return (
    Object.values(SPONSOR_COUPONS).find(
      (c) => c.normalizedCode === normalizedCode && c.active
    ) ?? null
  )
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type CouponValidationResult =
  | {
      valid: true
      normalizedCode: string
      displayCode: string
      discountPercent: number
      sponsorName: string
      stripePrefillCode: string
      alreadyUsed: false
    }
  | {
      valid: false
      reason:
        | "not_found"
        | "already_used"
        | "not_applicable"
        | "requires_auth"
        | "inactive"
      alreadyUsed: boolean
    }

export type RedemptionCreateInput = {
  userId: string
  normalizedCode: string
  displayCode: string
  sponsorName: string
  campaignName: string
  discountPercent: number
  appliesTo: CouponAppliesTo
  productKey?: string | null
  amountSubtotalCents?: number | null
  discountAmountCents?: number | null
  amountTotalCents?: number | null
}

// ── Core helpers ──────────────────────────────────────────────────────────────

/**
 * Returns true if the user has already successfully redeemed this code.
 * Checks for any row with status='redeemed' for this user+code.
 */
export async function userHasRedeemedCoupon(
  userId: string,
  normalizedCode: string
): Promise<boolean> {
  const db = (prisma as any).sponsorCouponRedemption
  if (!db) return false
  const row = await db.findFirst({
    where: { userId, normalizedCode, status: "redeemed" },
    select: { id: true },
  })
  return Boolean(row)
}

/**
 * Validates a coupon code for a specific user + product type.
 *
 * Returns { valid: false, reason: 'requires_auth' } when userId is null
 * because one-time-use enforcement requires identity.
 */
export async function validateCouponForUser({
  userId,
  rawCode,
  productType,
}: {
  userId: string | null
  rawCode: string
  productType: CouponAppliesTo
}): Promise<CouponValidationResult> {
  if (!userId) {
    return { valid: false, reason: "requires_auth", alreadyUsed: false }
  }

  const normalizedCode = normalizeCouponCode(rawCode)
  const coupon = findSponsorCoupon(normalizedCode)

  if (!coupon) {
    return { valid: false, reason: "not_found", alreadyUsed: false }
  }
  if (!coupon.active) {
    return { valid: false, reason: "inactive", alreadyUsed: false }
  }
  if (!coupon.appliesTo.includes(productType)) {
    return { valid: false, reason: "not_applicable", alreadyUsed: false }
  }

  const alreadyUsed = await userHasRedeemedCoupon(userId, normalizedCode)
  if (alreadyUsed) {
    return { valid: false, reason: "already_used", alreadyUsed: true }
  }

  return {
    valid: true,
    normalizedCode: coupon.normalizedCode,
    displayCode: coupon.displayCode,
    discountPercent: coupon.discountPercent,
    sponsorName: coupon.sponsorName,
    stripePrefillCode: coupon.stripePrefillCode,
    alreadyUsed: false,
  }
}

/**
 * Calculates the discounted price for a coupon.
 * Always rounds down to avoid charging less than intended.
 */
export function calculateDiscountedAmounts(
  subtotalCents: number,
  discountPercent: number
): { discountAmountCents: number; totalCents: number } {
  const discountAmountCents = Math.floor((subtotalCents * discountPercent) / 100)
  const totalCents = subtotalCents - discountAmountCents
  return { discountAmountCents, totalCents }
}

/**
 * Creates a pending redemption row when checkout begins.
 * If there's already a recent pending row for this user+code, returns it (idempotent).
 * Pending rows from abandoned checkouts (> 2 hours old) are ignored and a new one created.
 */
export async function createPendingRedemption(
  input: RedemptionCreateInput
): Promise<{ id: string } | null> {
  const db = (prisma as any).sponsorCouponRedemption
  if (!db) return null

  // Check for already-redeemed — hard block
  const redeemed = await userHasRedeemedCoupon(input.userId, input.normalizedCode)
  if (redeemed) return null

  // Clean up stale pending rows (> 2 hours) so they don't accumulate indefinitely
  const staleThreshold = new Date(Date.now() - 2 * 60 * 60 * 1000)
  await db
    .deleteMany({
      where: {
        userId: input.userId,
        normalizedCode: input.normalizedCode,
        status: "pending",
        createdAt: { lt: staleThreshold },
      },
    })
    .catch(() => null) // best effort

  // Reuse any fresh pending row (checkout reloaded within 2 hours)
  const existing = await db.findFirst({
    where: {
      userId: input.userId,
      normalizedCode: input.normalizedCode,
      status: "pending",
    },
    select: { id: true },
    orderBy: { createdAt: "desc" },
  })
  if (existing) return { id: existing.id }

  return db.create({
    data: {
      userId: input.userId,
      normalizedCode: input.normalizedCode,
      displayCode: input.displayCode,
      sponsorName: input.sponsorName,
      campaignName: input.campaignName,
      discountPercent: input.discountPercent,
      appliesTo: input.appliesTo,
      productKey: input.productKey ?? null,
      status: "pending",
      amountSubtotalCents: input.amountSubtotalCents ?? null,
      discountAmountCents: input.discountAmountCents ?? null,
      amountTotalCents: input.amountTotalCents ?? null,
    },
    select: { id: true },
  })
}

/**
 * Marks a pending redemption as redeemed after successful Stripe payment.
 * Called from the webhook handler. Idempotent — does nothing if already redeemed.
 *
 * @param stripeCheckoutSessionId — links the redemption to the Stripe session
 * @param userId — from the parsed client_reference_id
 * @param normalizedCode — from the parsed client_reference_id
 */
export async function redeemCouponFromWebhook({
  userId,
  normalizedCode,
  stripeCheckoutSessionId,
  stripePaymentIntentId,
  stripeInvoiceId,
  stripeSubscriptionId,
  amountSubtotalCents,
  discountAmountCents,
  amountTotalCents,
}: {
  userId: string
  normalizedCode: string
  stripeCheckoutSessionId?: string | null
  stripePaymentIntentId?: string | null
  stripeInvoiceId?: string | null
  stripeSubscriptionId?: string | null
  amountSubtotalCents?: number | null
  discountAmountCents?: number | null
  amountTotalCents?: number | null
}): Promise<{ redeemed: boolean; alreadyRedeemed: boolean }> {
  const db = (prisma as any).sponsorCouponRedemption
  if (!db) return { redeemed: false, alreadyRedeemed: false }

  // Already redeemed — idempotent no-op
  const alreadyRedeemed = await userHasRedeemedCoupon(userId, normalizedCode)
  if (alreadyRedeemed) return { redeemed: false, alreadyRedeemed: true }

  // Find the pending row (most recent for this user+code)
  const pending = await db.findFirst({
    where: { userId, normalizedCode, status: "pending" },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  })

  const now = new Date()
  const updateData = {
    status: "redeemed",
    redeemedAt: now,
    ...(stripeCheckoutSessionId ? { stripeCheckoutSessionId } : {}),
    ...(stripePaymentIntentId ? { stripePaymentIntentId } : {}),
    ...(stripeInvoiceId ? { stripeInvoiceId } : {}),
    ...(stripeSubscriptionId ? { stripeSubscriptionId } : {}),
    ...(amountSubtotalCents != null ? { amountSubtotalCents } : {}),
    ...(discountAmountCents != null ? { discountAmountCents } : {}),
    ...(amountTotalCents != null ? { amountTotalCents } : {}),
    updatedAt: now,
  }

  if (pending) {
    await db.update({ where: { id: pending.id }, data: updateData })
  } else {
    // No pending row (e.g., app restarted between checkout start and webhook)
    // Create a fresh redeemed record directly for audit trail
    const coupon = findSponsorCoupon(normalizedCode)
    if (coupon) {
      await db
        .create({
          data: {
            userId,
            normalizedCode,
            displayCode: coupon.displayCode,
            sponsorName: coupon.sponsorName,
            campaignName: coupon.campaignName,
            discountPercent: coupon.discountPercent,
            appliesTo: "token_pack", // default; will be overridden below if known
            ...updateData,
          },
        })
        .catch(() => null) // if unique partial index fires, redemption already exists
    }
  }

  return { redeemed: true, alreadyRedeemed: false }
}

/**
 * Expires all pending redemption rows for a user+code.
 * Called when checkout is explicitly cancelled or times out.
 */
export async function expirePendingRedemptions(
  userId: string,
  normalizedCode: string
): Promise<void> {
  const db = (prisma as any).sponsorCouponRedemption
  if (!db) return
  await db
    .updateMany({
      where: { userId, normalizedCode, status: "pending" },
      data: { status: "expired", updatedAt: new Date() },
    })
    .catch(() => null)
}
