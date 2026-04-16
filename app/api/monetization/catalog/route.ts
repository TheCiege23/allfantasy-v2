import { NextResponse } from "next/server"
import { getFanCredBoundaryDisclosure } from "@/lib/legal/FanCredBoundaryDisclosure"
import {
  getMonetizationCatalog,
  getMonetizationStripePriceIdForSku,
  type MonetizationCatalogItem,
} from "@/lib/monetization/catalog"
import { getStripeCheckoutLinkForSku } from "@/lib/monetization/StripeCheckoutLinkRegistry"
import { getRequiredStripeEnvKeys } from "@/lib/monetization/required-stripe-env"
import { listFeatureMonetizationMatrix } from "@/lib/monetization/feature-monetization-matrix"

type ApiMonetizationCatalogItem = MonetizationCatalogItem & {
  stripePriceConfigured: boolean
  checkoutProvider: "stripe_checkout_link"
}

function mapCatalogItem(item: MonetizationCatalogItem): ApiMonetizationCatalogItem {
  const checkoutLink = getStripeCheckoutLinkForSku(item.sku)
  const priceId = getMonetizationStripePriceIdForSku(item.sku)
  return {
    ...item,
    stripePriceConfigured: Boolean(checkoutLink && priceId),
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
      requiredStripeEnv: getRequiredStripeEnvKeys(),
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
