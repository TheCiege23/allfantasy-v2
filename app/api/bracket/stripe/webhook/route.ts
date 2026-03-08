import { NextRequest, NextResponse } from "next/server"
import { getStripeClient, getStripeWebhookSecret } from "@/lib/stripe-client"
import Stripe from "stripe"

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
      case "checkout.session.completed":
        console.log("[stripe webhook] checkout.session.completed", event.id)
        break
      case "payment_intent.succeeded":
        console.log("[stripe webhook] payment_intent.succeeded", event.id)
        break
      default:
        console.log("[stripe webhook] unhandled event", event.type)
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