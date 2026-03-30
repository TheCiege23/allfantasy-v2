import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getBaseUrl } from "@/lib/get-base-url"
import { getStripeClient } from "@/lib/stripe-client"
import {
  assertNoLeagueSettlementIntent,
  isMonetizationComplianceError,
} from "@/lib/monetization/compliance-guardrails"
import {
  getMonetizationCatalogItemBySku,
  getMonetizationStripePriceIdForSku,
  type MonetizationSku,
} from "@/lib/monetization/catalog"
import { buildCheckoutReturnUrls, resolveSafeReturnPath } from "@/lib/monetization/checkout-urls"

type CheckoutTokensBody = {
  sku?: string
  returnPath?: string
}

export async function POST(req: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as
      | { user?: { id?: string; email?: string | null } }
      | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = (await req.json()) as CheckoutTokensBody
    const sku = String(body?.sku ?? "").trim()
    if (!sku) {
      return NextResponse.json({ error: "Missing sku" }, { status: 400 })
    }

    assertNoLeagueSettlementIntent(sku, {
      route: "/api/monetization/checkout/tokens",
      purchaseType: "tokens",
      sku,
    })

    const item = getMonetizationCatalogItemBySku(sku as MonetizationSku)
    if (!item || item.type !== "token_pack") {
      return NextResponse.json({ error: "Invalid token pack sku" }, { status: 400 })
    }

    const priceId = getMonetizationStripePriceIdForSku(item.sku)
    if (!priceId) {
      return NextResponse.json(
        { error: "Stripe price not configured for this token pack sku" },
        { status: 500 }
      )
    }

    const baseUrl = getBaseUrl()
    const returnPath = resolveSafeReturnPath(body?.returnPath, "/pricing")
    const { successUrl, cancelUrl } = buildCheckoutReturnUrls(baseUrl, returnPath)

    const stripe = getStripeClient()
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: session.user.email ?? undefined,
      metadata: {
        purchaseType: "tokens",
        sku: item.sku,
        tokenAmount: String(item.tokenAmount ?? 0),
        userId: session.user.id,
      },
    })

    if (!checkoutSession.url) {
      return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 })
    }

    return NextResponse.json({
      url: checkoutSession.url,
      sessionId: checkoutSession.id,
      sku: item.sku,
      tokenAmount: item.tokenAmount ?? 0,
    })
  } catch (error) {
    if (isMonetizationComplianceError(error)) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      )
    }
    console.error("POST /api/monetization/checkout/tokens error:", error)
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 })
  }
}
