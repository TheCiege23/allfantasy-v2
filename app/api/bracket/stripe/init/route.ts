import { NextResponse } from "next/server"
import { getBaseUrl } from "@/lib/get-base-url"

let initialized = false

export async function POST() {
  if (initialized) {
    return NextResponse.json({
      ok: true,
      message: "Stripe already initialized",
    })
  }

  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "STRIPE_SECRET_KEY not set" },
        { status: 500 }
      )
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.warn(
        "[stripe/init] STRIPE_WEBHOOK_SECRET is not set yet. Webhook verification may fail until it is added."
      )
    }

    const webhookUrl = `${getBaseUrl()}/api/bracket/stripe/webhook`

    initialized = true

    return NextResponse.json({
      ok: true,
      message: "Stripe initialized successfully",
      webhookUrl,
    })
  } catch (err: any) {
    console.error("Stripe init error:", err)
    return NextResponse.json(
      { error: err?.message || "Stripe initialization failed" },
      { status: 500 }
    )
  }
}