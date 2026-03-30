import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/adminAuth"
import { getMonetizationCatalog } from "@/lib/monetization/catalog"
import { listStripeCheckoutLinkResolutions } from "@/lib/monetization/StripeCheckoutLinkRegistry"

export const dynamic = "force-dynamic"

function toCheckoutDestination(url: string | null): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url)
    return `${parsed.origin}${parsed.pathname}`
  } catch {
    return null
  }
}

export async function GET() {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res

  try {
    const catalog = getMonetizationCatalog()
    const resolutions = listStripeCheckoutLinkResolutions()
    const bySku = new Map(resolutions.map((entry) => [entry.sku, entry]))

    const products = catalog.all.map((item) => {
      const mapping = bySku.get(item.sku)
      const expectedPurchaseType = item.type === "subscription" ? "subscription" : "tokens"
      const purchaseTypeMismatch = mapping ? mapping.purchaseType !== expectedPurchaseType : false
      const issue = !mapping
        ? "missing_registry_entry"
        : purchaseTypeMismatch
          ? "purchase_type_mismatch"
          : !mapping.configured
            ? "checkout_link_missing_or_invalid"
            : null

      return {
        sku: item.sku,
        type: item.type,
        title: item.title,
        amountUsd: item.amountUsd,
        interval: item.interval,
        tokenAmount: item.tokenAmount,
        checkoutLinkEnvVar: mapping?.checkoutLinkEnvVar ?? null,
        expectedPurchaseType,
        mappedPurchaseType: mapping?.purchaseType ?? null,
        checkoutConfigured: Boolean(mapping?.configured),
        checkoutDestination: toCheckoutDestination(mapping?.checkoutUrl ?? null),
        issue,
      }
    })

    const configuredCount = products.filter((p) => p.checkoutConfigured).length
    const missingSkus = products
      .filter((p) => !p.checkoutConfigured || p.issue === "purchase_type_mismatch")
      .map((p) => p.sku)

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      summary: {
        totalProducts: products.length,
        configuredProducts: configuredCount,
        missingProducts: products.length - configuredCount,
      },
      missingSkus,
      products,
    })
  } catch (error) {
    console.error(
      "[admin/monetization/checkout-link-mapping GET]",
      error instanceof Error ? error.message : error
    )
    return NextResponse.json({ error: "Failed to load checkout link mapping diagnostics" }, { status: 500 })
  }
}
