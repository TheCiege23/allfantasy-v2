import { NextRequest, NextResponse } from "next/server"
import { getStripeClient, getStripeWebhookSecret } from "@/lib/stripe-client"
import { prisma } from "@/lib/prisma"
import Stripe from "stripe"

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
  return (
    normalizePurchaseType(metadata.purchaseType) ??
    normalizePurchaseType(metadata.purchase_type) ??
    normalizePurchaseType(metadata.paymentType)
  )
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message.slice(0, 2000)
  return String(error ?? "Unknown webhook error").slice(0, 2000)
}

async function routeCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<string | null> {
  const purchaseType = resolveCheckoutPurchaseType(session)

  if (!purchaseType) {
    console.warn("[stripe webhook] checkout.session.completed missing purchaseType metadata", {
      sessionId: session.id,
    })
    return null
  }

  if (SUPPORTED_PURCHASE_TYPES.has(purchaseType)) {
    // Phase-1.75 baseline: event routing is segmented by purchaseType.
    // Persistence for subscription/token grants is added in Phase-2/3.
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