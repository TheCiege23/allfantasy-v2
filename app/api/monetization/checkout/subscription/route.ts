import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
  assertNoLeagueSettlementIntent,
  isMonetizationComplianceError,
} from "@/lib/monetization/compliance-guardrails"
import {
  getMonetizationCatalogItemBySku,
  type MonetizationSku,
} from "@/lib/monetization/catalog"
import { resolveSafeReturnPath } from "@/lib/monetization/checkout-urls"
import { buildStripeCheckoutDestinationForSku } from "@/lib/monetization/StripeCheckoutLinkRegistry"
import { enforcePaidSubscriptionGeo } from "@/lib/geo/enforcePaidSubscriptionGeo"

type CheckoutSubscriptionBody = {
  sku?: string
  returnPath?: string
}

export async function POST(req: Request) {
  try {
    const geoBlock = await enforcePaidSubscriptionGeo(req)
    if (geoBlock) return geoBlock

    const session = (await getServerSession(authOptions as any)) as
      | { user?: { id?: string; email?: string | null } }
      | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = (await req.json()) as CheckoutSubscriptionBody
    const sku = String(body?.sku ?? "").trim()
    if (!sku) {
      return NextResponse.json({ error: "Missing sku" }, { status: 400 })
    }

    assertNoLeagueSettlementIntent(sku, {
      route: "/api/monetization/checkout/subscription",
      purchaseType: "subscription",
      sku,
    })

    const item = getMonetizationCatalogItemBySku(sku as MonetizationSku)
    if (!item || item.type !== "subscription") {
      return NextResponse.json({ error: "Invalid subscription sku" }, { status: 400 })
    }

    const returnPath = resolveSafeReturnPath(body?.returnPath, "/pricing")
    const destination = buildStripeCheckoutDestinationForSku({
      sku: item.sku,
      userId: session.user.id,
      userEmail: session.user.email ?? null,
      returnPath,
    })
    if (!destination || destination.purchaseType !== "subscription") {
      return NextResponse.json(
        {
          error:
            "Checkout is temporarily unavailable for this subscription plan. Please try again shortly.",
        },
        { status: 503 }
      )
    }

    return NextResponse.json({
      url: destination.url,
      sku: item.sku,
      purchaseType: "subscription",
    })
  } catch (error) {
    if (isMonetizationComplianceError(error)) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      )
    }
    console.error("POST /api/monetization/checkout/subscription error:", error)
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 })
  }
}
