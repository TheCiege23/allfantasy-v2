import type { EntitlementStatus } from "@/lib/subscription/types"

export type SubscriptionStatusInput = {
  status?: string | null
  currentPeriodEnd?: Date | string | null
  gracePeriodEnd?: Date | string | null
  expiresAt?: Date | string | null
}

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null
  const parsed = value instanceof Date ? value : new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function normalizeRawStatus(status: string | null | undefined): string {
  return String(status ?? "")
    .trim()
    .toLowerCase()
}

export function resolveSubscriptionStatus(
  input: SubscriptionStatusInput,
  now: Date = new Date()
): EntitlementStatus {
  const rawStatus = normalizeRawStatus(input.status)
  const currentPeriodEnd = toDate(input.currentPeriodEnd)
  const gracePeriodEnd = toDate(input.gracePeriodEnd)
  const expiresAt = toDate(input.expiresAt)
  const effectiveExpiry = expiresAt ?? currentPeriodEnd

  if (rawStatus === "none" || (!rawStatus && !effectiveExpiry && !gracePeriodEnd)) {
    return "none"
  }

  if (
    rawStatus === "active" ||
    rawStatus === "trialing" ||
    rawStatus === "trial" ||
    rawStatus === "paid"
  ) {
    if (!effectiveExpiry || effectiveExpiry >= now) return "active"
    if (gracePeriodEnd && gracePeriodEnd >= now) return "grace"
    return "expired"
  }

  if (rawStatus === "grace") {
    return gracePeriodEnd && gracePeriodEnd >= now ? "grace" : "expired"
  }

  if (rawStatus === "past_due" || rawStatus === "unpaid" || rawStatus === "incomplete") {
    if (gracePeriodEnd && gracePeriodEnd >= now) return "grace"
    if (effectiveExpiry && effectiveExpiry >= now) return "past_due"
    return "expired"
  }

  if (
    rawStatus === "canceled" ||
    rawStatus === "cancelled" ||
    rawStatus === "incomplete_expired" ||
    rawStatus === "expired"
  ) {
    if (effectiveExpiry && effectiveExpiry >= now) return "active"
    if (gracePeriodEnd && gracePeriodEnd >= now) return "grace"
    return "expired"
  }

  // Unknown status fallback:
  // - still active if period has not ended
  // - then grace if configured
  // - otherwise mark as expired.
  if (effectiveExpiry && effectiveExpiry >= now) return "active"
  if (gracePeriodEnd && gracePeriodEnd >= now) return "grace"
  return "expired"
}
