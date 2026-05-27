import { NextRequest, NextResponse } from "next/server"
import { getStripeClient, getStripeWebhookSecret } from "@/lib/stripe-client"
import { prisma } from "@/lib/prisma"
import Stripe from "stripe"
import {
  getMonetizationCatalogItemBySku,
  type MonetizationSku,
} from "@/lib/monetization/catalog"
import { parseStripeCheckoutClientReferenceId } from "@/lib/monetization/StripeCheckoutLinkRegistry"
import { TokenSpendService } from "@/lib/tokens/TokenSpendService"
import { syncUserProfileFromSubscriptions } from "@/lib/subscription/syncBridge"
import {
  grantMonthlyCreditsFromInvoice,
  markSubscriptionAsExpired,
  markSubscriptionPastDue,
  refreshSubscriptionPeriod,
  resolveUserIdFromStripeCustomerId,
  updateSubscriptionFromStripeEvent,
} from "@/lib/subscription/webhookHandlers"
import { persistLeagueEntryFeeFromStripeSession } from "@/lib/league-finance/leagueFinanceService"
import { adminRevokeTokensForPurchaseRefund } from "@/lib/tokens/adminTokenRefundService"

export const runtime = "nodejs"

const SUPPORTED_PURCHASE_TYPES = new Set(["subscription", "tokens"])
const FINANCE_PURCHASE_TYPES = new Set(["league_entry_fee"])
const PROCESSING_EVENT_STALE_MS = 5 * 60 * 1000
const LEGACY_PURCHASE_TYPES = new Set([
  "donate",
  "donation",
  "support_donation",
  "lab",
  "bracket_lab_pass",
  "first_bracket_fee",
  "unlimited_unlock",
])

function normalizePurchaseType(value: string | undefined): string | null {
  if (!value) return null
  const normalized = value.trim().toLowerCase()
  return normalized.length > 0 ? normalized : null
}

function resolveCheckoutPurchaseType(session: Stripe.Checkout.Session): string | null {
  const metadata = (session.metadata ?? {}) as Record<string, string | undefined>
  const fromClientReference = parseStripeCheckoutClientReferenceId(session.client_reference_id)
  return (
    normalizePurchaseType(metadata.purchaseType) ??
    normalizePurchaseType(metadata.purchase_type) ??
    normalizePurchaseType(metadata.paymentType) ??
    normalizePurchaseType(fromClientReference?.purchaseType)
  )
}

function resolveCheckoutContext(
  session: Stripe.Checkout.Session
): { userId: string; sku: MonetizationSku } | null {
  const metadata = (session.metadata ?? {}) as Record<string, string | undefined>
  const metadataUserId = metadata.userId?.trim()
  const metadataSku = metadata.sku?.trim().toLowerCase()
  if (metadataUserId && metadataSku) {
    return {
      userId: metadataUserId,
      sku: metadataSku as MonetizationSku,
    }
  }

  const fromClientReference = parseStripeCheckoutClientReferenceId(session.client_reference_id)
  if (!fromClientReference) return null
  return {
    userId: fromClientReference.userId,
    sku: fromClientReference.sku,
  }
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message.slice(0, 2000)
  return String(error ?? "Unknown webhook error").slice(0, 2000)
}

function isFreshProcessingEvent(existing: {
  status?: string | null
  updatedAt?: Date | string | null
  createdAt?: Date | string | null
}) {
  if (existing.status !== "processing") return false
  const timestamp = existing.updatedAt ?? existing.createdAt
  const time = timestamp ? new Date(timestamp).getTime() : Number.NaN
  if (!Number.isFinite(time)) return true
  return Date.now() - time < PROCESSING_EVENT_STALE_MS
}

/**
 * Thrown when a webhook event cannot be fulfilled due to a permanent data
 * problem (e.g. missing client_reference_id, unrecognised SKU).  Unlike a
 * transient DB error, retrying this event will never succeed, so the handler
 * marks it "error" in the DB for admin visibility but returns HTTP 200 to
 * Stripe to prevent an endless 3-day retry storm.
 */
class NonRetryableWebhookError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "NonRetryableWebhookError"
  }
}

function addBillingInterval(base: Date, interval: "month" | "year"): Date {
  const next = new Date(base)
  if (interval === "year") {
    next.setUTCFullYear(next.getUTCFullYear() + 1)
  } else {
    next.setUTCMonth(next.getUTCMonth() + 1)
  }
  return next
}

async function persistSubscriptionEntitlementFromCheckout(
  session: Stripe.Checkout.Session,
  context: { userId: string; sku: MonetizationSku } | null
): Promise<void> {
  if (!context?.userId || !context?.sku) return

  const item = getMonetizationCatalogItemBySku(context.sku)
  if (!item || item.type !== "subscription" || !item.planFamily || !item.interval) return

  const plans = (prisma as any).subscriptionPlan
  const subscriptions = (prisma as any).userSubscription
  if (!plans || !subscriptions) return

  const now = new Date()
  const currentPeriodEnd = addBillingInterval(now, item.interval)
  const stripeSubscriptionId =
    typeof session.subscription === "string" ? session.subscription : null

  const plan = await plans.upsert({
    where: { code: item.planFamily },
    update: {
      name: item.title.replace(" Monthly", "").replace(" Yearly", ""),
      description: item.description,
      isBundle: item.planFamily === "af_supreme",
      isActive: true,
      metadata: {
        sku: item.sku,
        interval: item.interval,
        amountUsd: item.amountUsd,
      },
    },
    create: {
      code: item.planFamily,
      name: item.title.replace(" Monthly", "").replace(" Yearly", ""),
      description: item.description,
      isBundle: item.planFamily === "af_supreme",
      isActive: true,
      metadata: {
        sku: item.sku,
        interval: item.interval,
        amountUsd: item.amountUsd,
      },
    },
    select: { id: true },
  })

  const baseData = {
    userId: context.userId,
    subscriptionPlanId: plan.id,
    status: "active",
    source: "stripe",
    sku: item.sku,
    stripeCustomerId:
      typeof session.customer === "string" ? session.customer : null,
    stripeCheckoutSessionId: session.id,
    currentPeriodStart: now,
    currentPeriodEnd,
    gracePeriodEnd: null,
    canceledAt: null,
    expiresAt: null,
    metadata: {
      purchaseType: "subscription",
      stripeSessionMode: session.mode ?? "subscription",
    },
  }

  if (stripeSubscriptionId) {
    await subscriptions.upsert({
      where: { stripeSubscriptionId },
      update: baseData,
      create: {
        ...baseData,
        stripeSubscriptionId,
      },
    })
    return
  }

  const existingByCheckout = await subscriptions.findFirst({
    where: { stripeCheckoutSessionId: session.id },
    select: { id: true },
  })
  if (existingByCheckout?.id) {
    await subscriptions.update({
      where: { id: existingByCheckout.id },
      data: baseData,
    })
    return
  }

  await subscriptions.upsert({
    where: { stripeCheckoutSessionId: session.id },
    update: baseData,
    create: baseData,
  })
}

async function persistTokenPurchaseFromCheckout(
  session: Stripe.Checkout.Session,
  context: { userId: string; sku: MonetizationSku } | null
): Promise<void> {
  // Missing context means client_reference_id was absent or malformed AND no
  // metadata fallback.  This is a permanent data problem — retrying won't fix
  // it — so we throw NonRetryableWebhookError to mark the event as "error" in
  // the DB (admin-visible) without triggering Stripe's retry loop.
  if (!context?.userId || !context?.sku) {
    throw new NonRetryableWebhookError(
      `token_grant_skipped:missing_context session=${session.id} ` +
        `hasUserId=${!!context?.userId} hasSku=${!!context?.sku}`
    )
  }

  const item = getMonetizationCatalogItemBySku(context.sku)
  if (!item || item.type !== "token_pack") {
    throw new NonRetryableWebhookError(
      `token_grant_skipped:invalid_sku sku=${context.sku} ` +
        `itemType=${item?.type ?? "not_found"} session=${session.id}`
    )
  }

  const service = new TokenSpendService()
  await service.grantTokensFromPackagePurchase({
    userId: context.userId,
    packageSku: item.sku,
    sourceType: "stripe_checkout",
    sourceId: session.id,
    idempotencyKey: `stripe_checkout:${session.id}:${item.sku}`,
    description: `Stripe purchase: ${item.title}`,
    metadata: {
      checkoutSessionId: session.id,
      stripeCustomerId: typeof session.customer === "string" ? session.customer : null,
      purchaseType: "tokens",
      sku: item.sku,
      tokenAmount: item.tokenAmount ?? null,
    },
  })
}

async function routeCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<string | null> {
  const purchaseType = resolveCheckoutPurchaseType(session)
  const checkoutContext = resolveCheckoutContext(session)

  if (!purchaseType) {
    console.warn("[stripe webhook] checkout.session.completed missing purchaseType metadata", {
      sessionId: session.id,
    })
    return null
  }

  if (SUPPORTED_PURCHASE_TYPES.has(purchaseType)) {
    if (purchaseType === "subscription") {
      await persistSubscriptionEntitlementFromCheckout(session, checkoutContext)
      if (checkoutContext?.userId) {
        await syncUserProfileFromSubscriptions(checkoutContext.userId)
      }
    } else if (purchaseType === "tokens") {
      await persistTokenPurchaseFromCheckout(session, checkoutContext)
    }
    return purchaseType
  }

  if (FINANCE_PURCHASE_TYPES.has(purchaseType)) {
    if (purchaseType === "league_entry_fee") {
      await persistLeagueEntryFeeFromStripeSession(session)
    }
    return purchaseType
  }

  if (LEGACY_PURCHASE_TYPES.has(purchaseType)) {
    // Transitional values are intentionally tolerated for backward compatibility.
    return purchaseType
  }

  console.warn("[stripe webhook] unknown purchaseType ignored safely", {
    purchaseType,
    sessionId: session.id,
  })
  return purchaseType
}

/**
 * Look up the original token purchase for a Stripe refund and call
 * adminRevokeTokensForPurchaseRefund to revoke tokens proportionally.
 *
 * Lookup chain:
 *   payment_intent ID
 *   → stripe.checkout.sessions.list({ payment_intent })
 *   → tokenLedger.findFirst({ sourceType: "stripe_checkout", sourceId: session.id, entryType: "purchase" })
 *   → adminRevokeTokensForPurchaseRefund (idempotent on stripeRefundId)
 *
 * Non-throwing: always returns a descriptive string for logging. Never returns
 * a status code — it is the caller's responsibility to return 2xx to Stripe.
 */
async function resolveAndRevokeTokensForStripeRefund(params: {
  refundId: string
  paymentIntentId: string
  refundAmountCents: number
}): Promise<"processed" | "not_token_purchase" | "no_session" | "no_ledger_entry" | "skipped_zero"> {
  const { refundId, paymentIntentId, refundAmountCents } = params
  const stripe = getStripeClient()

  // 1. Find the Stripe Checkout Session by payment intent
  const sessions = await stripe.checkout.sessions.list({
    payment_intent: paymentIntentId,
    limit: 1,
  })
  const session = sessions.data[0]
  if (!session) {
    console.info("[stripe webhook] refund: no checkout session for payment_intent — not a checkout purchase", {
      paymentIntentId,
      refundId,
    })
    return "no_session"
  }

  // 2. Only process token purchases — subscription refunds do not touch the token ledger
  const purchaseType = resolveCheckoutPurchaseType(session)
  if (purchaseType !== "tokens") {
    console.info("[stripe webhook] refund: session purchaseType is not 'tokens', skipping token revocation", {
      refundId,
      purchaseType,
      sessionId: session.id,
    })
    return "not_token_purchase"
  }

  // 3. Find the token grant ledger row by checkout session ID
  //    sourceId stores the Checkout Session ID at purchase time
  const purchaseLedger = await (prisma as any).tokenLedger.findFirst({
    where: {
      sourceType: "stripe_checkout",
      sourceId: session.id,
      entryType: "purchase",
    },
    select: { userId: true, tokenDelta: true },
  })
  if (!purchaseLedger) {
    console.warn("[stripe webhook] refund: no token purchase ledger row found for session — may have been fulfilled differently", {
      refundId,
      sessionId: session.id,
    })
    return "no_ledger_entry"
  }

  const originalTokens = Math.max(0, Number(purchaseLedger.tokenDelta || 0))
  if (originalTokens === 0) return "no_ledger_entry"

  // 4. Compute proportional revocation for partial refunds
  //    Full refund: proportion = 1 → revoke all tokens
  //    Partial refund: proportion = refundAmount / sessionTotal
  const sessionTotal = Math.max(0, Number(session.amount_total || 0))
  const proportion = sessionTotal > 0 ? Math.min(1, refundAmountCents / sessionTotal) : 1
  const tokensToRevoke = Math.max(0, Math.round(originalTokens * proportion))

  if (tokensToRevoke === 0) {
    console.info("[stripe webhook] refund: computed 0 tokens to revoke, skipping", {
      refundId,
      proportion,
      originalTokens,
    })
    return "skipped_zero"
  }

  // 5. Revoke — idempotencyKey = "stripe_refund:{refundId}" prevents double-processing
  //    on Stripe webhook retries. Balance is floored at 0 inside the service.
  await adminRevokeTokensForPurchaseRefund({
    userId: String(purchaseLedger.userId),
    stripeRefundId: refundId,
    tokensToRevoke,
    reason: "payment_error",
    adminEmail: "stripe-webhook@system",
    adminNote:
      sessionTotal > 0
        ? `Auto: refunded $${(refundAmountCents / 100).toFixed(2)} of $${(sessionTotal / 100).toFixed(2)} (${Math.round(proportion * 100)}%).`
        : `Auto: full refund ${refundId}.`,
  })

  return "processed"
}

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get("stripe-signature")
    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      )
    }

    const body = await req.text()
    const stripe = getStripeClient()
    const webhookSecret = getStripeWebhookSecret()

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err: any) {
      return NextResponse.json(
        { error: `Webhook signature verification failed: ${err.message}` },
        { status: 400 }
      )
    }

    const events = (prisma as any).stripeWebhookEvent
    const existing = await events.findUnique({
      where: { eventId: event.id },
      select: { status: true, createdAt: true, updatedAt: true },
    })

    if (existing?.status === "processed") {
      return NextResponse.json({ received: true, duplicate: true })
    }

    if (existing?.status === "processing" && isFreshProcessingEvent(existing)) {
      return NextResponse.json(
        { received: false, retry: true, status: "processing" },
        { status: 409 }
      )
    }

    if (existing?.status === "error" || existing?.status === "processing") {
      await events.update({
        where: { eventId: event.id },
        data: { status: "processing", error: null, type: event.type },
      })
    } else {
      try {
        await events.create({
          data: {
            eventId: event.id,
            type: event.type,
            status: "processing",
          },
        })
      } catch (createError: any) {
        if (createError?.code === "P2002") {
          return NextResponse.json(
            { received: false, retry: true, status: "processing" },
            { status: 409 }
          )
        }
        throw createError
      }
    }

    let purchaseType: string | null = null

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session
          purchaseType = await routeCheckoutSessionCompleted(session)
          break
        }
        case "customer.subscription.updated": {
          const updatedSub = event.data.object as Stripe.Subscription
          const customerId =
            typeof updatedSub.customer === "string" ? updatedSub.customer : null
          const userId = customerId ? await resolveUserIdFromStripeCustomerId(customerId) : null
          if (userId) {
            await updateSubscriptionFromStripeEvent(updatedSub, userId)
            await syncUserProfileFromSubscriptions(userId)
          }
          break
        }
        case "customer.subscription.deleted": {
          const deletedSub = event.data.object as Stripe.Subscription
          const customerId =
            typeof deletedSub.customer === "string" ? deletedSub.customer : null
          const userId = customerId ? await resolveUserIdFromStripeCustomerId(customerId) : null
          if (userId) {
            await markSubscriptionAsExpired(deletedSub, userId)
            await syncUserProfileFromSubscriptions(userId)
          }
          break
        }
        case "invoice.payment_failed": {
          const invoice = event.data.object as Stripe.Invoice
          const customerId = typeof invoice.customer === "string" ? invoice.customer : null
          const userId = customerId ? await resolveUserIdFromStripeCustomerId(customerId) : null
          if (userId) {
            await markSubscriptionPastDue(invoice, userId)
            await syncUserProfileFromSubscriptions(userId)
          }
          break
        }
        case "invoice.payment_succeeded": {
          const invoice = event.data.object as Stripe.Invoice
          const reason = invoice.billing_reason
          if (reason === "subscription_cycle" || reason === "subscription_create") {
            const customerId = typeof invoice.customer === "string" ? invoice.customer : null
            const userId = customerId ? await resolveUserIdFromStripeCustomerId(customerId) : null
            if (userId) {
              await refreshSubscriptionPeriod(invoice, userId)
              await syncUserProfileFromSubscriptions(userId)
              await grantMonthlyCreditsFromInvoice(invoice, userId)
            }
          }
          break
        }
        // ── Stripe refund events — automatic token revocation ──────────────
        // charge.refunded fires when a charge is (partially) refunded.
        // refund.created fires when a new Refund object is created.
        // refund.updated fires when a refund transitions (e.g. pending→succeeded).
        //
        // All three call resolveAndRevokeTokensForStripeRefund which:
        //   1. Looks up the Checkout Session by payment intent via Stripe API
        //   2. Skips non-token purchases (subscriptions, league fees, etc.)
        //   3. Finds the token purchase ledger row by session ID
        //   4. Computes proportional tokensToRevoke (partial refund support)
        //   5. Calls adminRevokeTokensForPurchaseRefund with idempotencyKey
        //      "stripe_refund:{refundId}" — safe to retry, no double-revoke
        //
        // POST /api/admin/tokens/refund remains available for manual override.
        // ────────────────────────────────────────────────────────────────────────
        case "charge.refunded": {
          const charge = event.data.object as Stripe.Charge
          // charge.refunds is embedded in the webhook payload; data[0] is the latest refund
          const chargeRefunds = (charge.refunds as { data: Array<{ id: string; amount: number }> } | undefined | null)
          const latestRefund = chargeRefunds?.data?.[0]
          const piId = typeof charge.payment_intent === "string" ? charge.payment_intent : null
          if (latestRefund?.id && piId && typeof latestRefund.amount === "number") {
            await resolveAndRevokeTokensForStripeRefund({
              refundId: latestRefund.id,
              paymentIntentId: piId,
              refundAmountCents: latestRefund.amount,
            })
          }
          break
        }
        case "refund.created":
        case "refund.updated": {
          const refund = event.data.object as Stripe.Refund
          // Only act on succeeded refunds — "pending" transitions to succeeded via refund.updated
          if (refund.status !== "succeeded") break
          const piId = typeof refund.payment_intent === "string" ? refund.payment_intent : null
          if (!piId) {
            console.info("[stripe webhook] refund event has no payment_intent, skipping", {
              refundId: refund.id,
              type: event.type,
            })
            break
          }
          await resolveAndRevokeTokensForStripeRefund({
            refundId: refund.id,
            paymentIntentId: piId,
            refundAmountCents: refund.amount,
          })
          break
        }
        default:
          break
      }

      await events.update({
        where: { eventId: event.id },
        data: {
          status: "processed",
          purchaseType,
          processedAt: new Date(),
          error: null,
        },
      })
    } catch (processingError) {
      await events
        .update({
          where: { eventId: event.id },
          data: {
            status: "error",
            purchaseType,
            processedAt: new Date(),
            error: toErrorMessage(processingError),
          },
        })
        .catch(() => null)

      // Permanent fulfillment failures (bad/missing client_reference_id, unknown
      // SKU) must NOT cause HTTP 500 — Stripe would retry for 3 days with zero
      // chance of success.  We have already marked the event "error" in the DB
      // so the admin health endpoint can surface it.  Return 200 to Stripe.
      if (processingError instanceof NonRetryableWebhookError) {
        console.error("[stripe webhook] non-retryable fulfillment error — event marked error in DB, no Stripe retry:", processingError.message)
        return NextResponse.json({
          received: true,
          eventType: event.type,
          purchaseType,
          fulfillmentError: processingError.message,
        })
      }

      throw processingError
    }

    return NextResponse.json({ received: true, eventType: event.type, purchaseType })
  } catch (err: any) {
    console.error("[stripe webhook] error:", err)
    return NextResponse.json(
      { error: err?.message || "Webhook handler failed" },
      { status: 500 }
    )
  }
}
