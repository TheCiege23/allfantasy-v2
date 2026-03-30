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

export const runtime = "nodejs"

const SUPPORTED_PURCHASE_TYPES = new Set(["subscription", "tokens"])
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
      isBundle: item.planFamily === "af_all_access",
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
      isBundle: item.planFamily === "af_all_access",
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

  await subscriptions.create({
    data: baseData,
  })
}

async function persistTokenPurchaseFromCheckout(
  session: Stripe.Checkout.Session,
  context: { userId: string; sku: MonetizationSku } | null
): Promise<void> {
  if (!context?.userId || !context?.sku) return

  const item = getMonetizationCatalogItemBySku(context.sku)
  if (!item || item.type !== "token_pack") return

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
    } else if (purchaseType === "tokens") {
      await persistTokenPurchaseFromCheckout(session, checkoutContext)
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
      select: { status: true },
    })

    if (existing?.status === "processed" || existing?.status === "processing") {
      return NextResponse.json({ received: true, duplicate: true })
    }

    if (existing?.status === "error") {
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
          return NextResponse.json({ received: true, duplicate: true })
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