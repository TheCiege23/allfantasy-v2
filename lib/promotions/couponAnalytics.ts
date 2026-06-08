"use client"

/**
 * Coupon and monetization funnel analytics events.
 * Part 8 of the visual conversion build.
 *
 * All events are forwarded to gtag (GA4) via gtagEvent.
 * Backend/CAPI events are handled separately in the API routes.
 */

import { gtagEvent } from "@/lib/gtag"

// ── Coupon lifecycle ──────────────────────────────────────────────────────────

export function trackCouponViewed(params: {
  couponCode: string
  surface: string
  productType?: "token_pack" | "subscription" | "any"
}): void {
  gtagEvent("CouponViewed", {
    coupon_code: params.couponCode,
    surface: params.surface,
    product_type: params.productType ?? "any",
  })
}

export function trackCouponApplyClicked(params: {
  couponCode: string
  surface: string
  productType?: "token_pack" | "subscription" | "any"
}): void {
  gtagEvent("CouponApplyClicked", {
    coupon_code: params.couponCode,
    surface: params.surface,
    product_type: params.productType ?? "any",
  })
}

export function trackCouponApplied(params: {
  couponCode: string
  discountPercent: number
  surface: string
  productType?: "token_pack" | "subscription"
}): void {
  gtagEvent("CouponApplied", {
    coupon_code: params.couponCode,
    discount_percent: params.discountPercent,
    surface: params.surface,
    product_type: params.productType ?? null,
  })
}

export function trackCouponRejected(params: {
  couponCode: string
  reason: string
  surface: string
}): void {
  gtagEvent("CouponRejected", {
    coupon_code: params.couponCode,
    reason: params.reason,
    surface: params.surface,
  })
}

// ── Token pack ────────────────────────────────────────────────────────────────

export function trackTokenPackViewed(params: {
  sku: string
  surface: string
  couponCode?: string
}): void {
  gtagEvent("TokenPackViewed", {
    sku: params.sku,
    surface: params.surface,
    coupon_code: params.couponCode ?? null,
  })
}

export function trackTokenPackCheckoutClicked(params: {
  sku: string
  surface: string
  couponApplied?: boolean
  couponCode?: string
}): void {
  gtagEvent("TokenPackCheckoutClicked", {
    sku: params.sku,
    surface: params.surface,
    coupon_applied: params.couponApplied ?? false,
    coupon_code: params.couponCode ?? null,
  })
}

// ── Subscription ──────────────────────────────────────────────────────────────

export function trackSubscriptionViewed(params: {
  sku: string
  surface: string
  couponCode?: string
}): void {
  gtagEvent("SubscriptionViewed", {
    sku: params.sku,
    surface: params.surface,
    coupon_code: params.couponCode ?? null,
  })
}

export function trackSubscriptionCheckoutClicked(params: {
  sku: string
  surface: string
  couponApplied?: boolean
  couponCode?: string
}): void {
  gtagEvent("SubscriptionCheckoutClicked", {
    sku: params.sku,
    surface: params.surface,
    coupon_applied: params.couponApplied ?? false,
    coupon_code: params.couponCode ?? null,
  })
}

// ── AI / token spend ──────────────────────────────────────────────────────────

export function trackAIUpsellViewed(params: {
  surface: string
  feature?: string
  ruleCode?: string
}): void {
  gtagEvent("AIUpsellViewed", {
    surface: params.surface,
    feature: params.feature ?? null,
    rule_code: params.ruleCode ?? null,
  })
}

export function trackAIInsufficientTokensShown(params: {
  surface: string
  ruleCode: string
  tokenCost: number
  currentBalance: number
}): void {
  gtagEvent("AIInsufficientTokensShown", {
    surface: params.surface,
    rule_code: params.ruleCode,
    token_cost: params.tokenCost,
    current_balance: params.currentBalance,
  })
}
