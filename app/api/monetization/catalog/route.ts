import { NextResponse } from "next/server"
import { getFanCredBoundaryDisclosure } from "@/lib/legal/FanCredBoundaryDisclosure"
import {
  getMonetizationCatalog,
  type MonetizationCatalogItem,
} from "@/lib/monetization/catalog"
import { getStripeCheckoutLinkForSku } from "@/lib/monetization/StripeCheckoutLinkRegistry"
import { listFeatureMonetizationMatrix } from "@/lib/monetization/feature-monetization-matrix"

type ApiMonetizationCatalogItem = MonetizationCatalogItem & {
  stripePriceConfigured: boolean
  checkoutProvider: "stripe_checkout_link"
}

function mapCatalogItem(item: MonetizationCatalogItem): ApiMonetizationCatalogItem {
  const checkoutLink = getStripeCheckoutLinkForSku(item.sku)
  return {
    ...item,
    stripePriceConfigured: Boolean(checkoutLink),
    checkoutProvider: "stripe_checkout_link",
  }
}

export async function GET() {
  const catalog = getMonetizationCatalog()
  const featureMatrix = listFeatureMonetizationMatrix()

  return NextResponse.json(
    {
      catalog: {
        subscriptions: catalog.subscriptions.map(mapCatalogItem),
        tokenPacks: catalog.tokenPacks.map(mapCatalogItem),
        all: catalog.all.map(mapCatalogItem),
      },
      featureMatrix,
      fancredBoundary: getFanCredBoundaryDisclosure(),
      generatedAt: new Date().toISOString(),
    },
    {
      headers: {
        "cache-control": "public, max-age=60, s-maxage=60, stale-while-revalidate=120",
      },
    }
  )
}
