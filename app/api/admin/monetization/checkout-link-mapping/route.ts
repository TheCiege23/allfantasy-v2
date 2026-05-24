import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/adminAuth"
import { getMonetizationCatalog } from "@/lib/monetization/catalog"
import { listStripeCheckoutLinkResolutions } from "@/lib/monetization/StripeCheckoutLinkRegistry"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res

  const catalog = getMonetizationCatalog()
  const resolutions = listStripeCheckoutLinkResolutions()

  const resolutionMap = new Map(resolutions.map((r) => [r.sku, r]))

  const products = catalog.all.map((item) => {
    const resolution = resolutionMap.get(item.sku)
    const checkoutConfigured = Boolean(resolution?.configured)
    const expectedPurchaseType = item.type === "subscription" ? "subscription" : "tokens"
    const mappedPurchaseType = resolution?.purchaseType ?? null
    const checkoutDestination = resolution?.checkoutUrl ?? null

    let issue: string | null = null
    if (!checkoutConfigured) {
      issue = "checkout_link_missing_or_invalid"
    } else if (mappedPurchaseType && mappedPurchaseType !== expectedPurchaseType) {
      issue = "purchase_type_mismatch"
    }

    return {
      sku: item.sku,
      title: item.title,
      checkoutConfigured,
      expectedPurchaseType: expectedPurchaseType as "subscription" | "tokens",
      mappedPurchaseType,
      checkoutDestination,
      issue,
    }
  })

  const configuredProducts = products.filter((p) => p.checkoutConfigured).length
  const missingProducts = products.length - configuredProducts
  const missingSkus = products.filter((p) => !p.checkoutConfigured).map((p) => p.sku)

  return NextResponse.json({
    summary: {
      totalProducts: products.length,
      configuredProducts,
      missingProducts,
    },
    missingSkus,
    products,
  })
}
