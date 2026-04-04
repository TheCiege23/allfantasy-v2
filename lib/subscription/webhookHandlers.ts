import type Stripe from "stripe"
import { prisma } from "@/lib/prisma"

const GRACE_DAYS = 7

function addDays(base: Date, days: number): Date {
  const d = new Date(base)
  d.setUTCDate(d.getUTCDate() + days)
  return d
}

export async function resolveUserIdFromStripeCustomerId(
  customerId: string | null | undefined
): Promise<string | null> {
  if (!customerId || typeof customerId !== "string") return null
  const row = await prisma.userSubscription.findFirst({
    where: { stripeCustomerId: customerId },
    select: { userId: true },
    orderBy: { updatedAt: "desc" },
  })
  return row?.userId ?? null
}

/** Map Stripe subscription.status to our persisted DB status string. */
export function mapStripeSubscriptionStatus(stripeStatus: Stripe.Subscription.Status): string {
  switch (stripeStatus) {
    case "active":
    case "trialing":
      return stripeStatus === "trialing" ? "trialing" : "active"
    case "past_due":
    case "unpaid":
      return "past_due"
    case "canceled":
      return "canceled"
    case "incomplete_expired":
      return "expired"
    case "paused":
      return "paused"
    case "incomplete":
      return "incomplete"
    default:
      return String(stripeStatus)
  }
}

export async function updateSubscriptionFromStripeEvent(
  sub: Stripe.Subscription,
  userId: string
): Promise<void> {
  const stripeSubscriptionId = sub.id
  const stripeCustomerId = typeof sub.customer === "string" ? sub.customer : null
  const status = mapStripeSubscriptionStatus(sub.status)
  const currentPeriodStart = sub.current_period_start
    ? new Date(sub.current_period_start * 1000)
    : null
  const currentPeriodEnd = sub.current_period_end
    ? new Date(sub.current_period_end * 1000)
    : null

  const existing = await prisma.userSubscription.findUnique({
    where: { stripeSubscriptionId },
    select: { id: true, userId: true },
  })

  if (existing) {
    if (existing.userId !== userId) return
    await prisma.userSubscription.update({
      where: { stripeSubscriptionId },
      data: {
        status,
        stripeCustomerId: stripeCustomerId ?? undefined,
        currentPeriodStart,
        currentPeriodEnd,
        metadata: { lastStripeEvent: "customer.subscription.updated" },
      },
    })
    return
  }

  const fallback = await prisma.userSubscription.findFirst({
    where: {
      userId,
      ...(stripeCustomerId ? { stripeCustomerId } : {}),
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  })

  if (!fallback) return

  await prisma.userSubscription.update({
    where: { id: fallback.id },
    data: {
      stripeSubscriptionId,
      status,
      stripeCustomerId: stripeCustomerId ?? undefined,
      currentPeriodStart,
      currentPeriodEnd,
      metadata: { lastStripeEvent: "customer.subscription.updated" },
    },
  })
}

export async function markSubscriptionAsExpired(
  sub: Stripe.Subscription,
  userId: string
): Promise<void> {
  const now = new Date()
  const stripeSubscriptionId = sub.id
  const ended =
    sub.ended_at != null ? new Date(sub.ended_at * 1000) : sub.canceled_at != null
      ? new Date(sub.canceled_at * 1000)
      : now

  const res = await prisma.userSubscription.updateMany({
    where: {
      userId,
      stripeSubscriptionId,
    },
    data: {
      status: "canceled",
      canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : now,
      expiresAt: ended,
      currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : ended,
      metadata: { lastStripeEvent: "customer.subscription.deleted" },
    },
  })

  if (res.count === 0 && typeof sub.customer === "string") {
    await prisma.userSubscription.updateMany({
      where: {
        userId,
        stripeCustomerId: sub.customer,
      },
      data: {
        status: "canceled",
        canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : now,
        expiresAt: ended,
        metadata: { lastStripeEvent: "customer.subscription.deleted" },
      },
    })
  }
}

export async function markSubscriptionPastDue(
  invoice: Stripe.Invoice,
  userId: string
): Promise<void> {
  const now = new Date()
  const gracePeriodEnd = addDays(now, GRACE_DAYS)
  const subId =
    typeof invoice.subscription === "string"
      ? invoice.subscription
      : invoice.subscription && typeof invoice.subscription !== "string"
        ? invoice.subscription.id
        : null

  if (subId) {
    await prisma.userSubscription.updateMany({
      where: { userId, stripeSubscriptionId: subId },
      data: {
        status: "past_due",
        gracePeriodEnd,
        metadata: { lastStripeEvent: "invoice.payment_failed", invoiceId: invoice.id },
      },
    })
    return
  }

  const customerId = typeof invoice.customer === "string" ? invoice.customer : null
  await prisma.userSubscription.updateMany({
    where: {
      userId,
      ...(customerId ? { stripeCustomerId: customerId } : {}),
    },
    data: {
      status: "past_due",
      gracePeriodEnd,
      metadata: { lastStripeEvent: "invoice.payment_failed", invoiceId: invoice.id },
    },
  })
}

export async function refreshSubscriptionPeriod(
  invoice: Stripe.Invoice,
  userId: string
): Promise<void> {
  const subId =
    typeof invoice.subscription === "string"
      ? invoice.subscription
      : invoice.subscription && typeof invoice.subscription !== "string"
        ? invoice.subscription.id
        : null

  const periodEndSec = invoice.period_end ?? null
  const currentPeriodEnd =
    periodEndSec != null ? new Date(periodEndSec * 1000) : null

  if (subId) {
    await prisma.userSubscription.updateMany({
      where: { userId, stripeSubscriptionId: subId },
      data: {
        status: "active",
        gracePeriodEnd: null,
        ...(currentPeriodEnd ? { currentPeriodEnd } : {}),
        metadata: {
          lastStripeEvent: "invoice.payment_succeeded",
          invoiceId: invoice.id,
          billingReason: invoice.billing_reason ?? null,
        },
      },
    })
    return
  }

  const customerId = typeof invoice.customer === "string" ? invoice.customer : null
  await prisma.userSubscription.updateMany({
    where: {
      userId,
      ...(customerId ? { stripeCustomerId: customerId } : {}),
    },
    data: {
      status: "active",
      gracePeriodEnd: null,
      ...(currentPeriodEnd ? { currentPeriodEnd } : {}),
      metadata: {
        lastStripeEvent: "invoice.payment_succeeded",
        invoiceId: invoice.id,
      },
    },
  })
}
