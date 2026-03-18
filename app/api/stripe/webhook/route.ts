import { NextRequest, NextResponse } from "next/server"
import { getStripeClient, getStripeWebhookSecret } from "@/lib/stripe-client"
import Stripe from "stripe"

export const runtime = "nodejs"

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

    switch (event.type) {
      case "checkout.session.completed": {
        // Main app donate/lab: metadata has userId, tournamentId, purchase_type. Persist when
        // UserSubscription or payment table exists; until then Stripe has the source of truth.
        const session = event.data.object as Stripe.Checkout.Session
        const meta = session?.metadata as { userId?: string; purchase_type?: string } | undefined
        if (meta?.userId && meta?.purchase_type) {
          // Optional: future persistence for lab/donation entitlement
        }
        break
      }
      case "payment_intent.succeeded":
        break
      default:
        break
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error("[stripe webhook] error:", err)
    return NextResponse.json(
      { error: err?.message || "Webhook handler failed" },
      { status: 500 }
    )
  }
}