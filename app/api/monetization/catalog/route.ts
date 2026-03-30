import { NextResponse } from "next/server"
import { getFanCredBoundaryDisclosure } from "@/lib/legal/FanCredBoundaryDisclosure"
import {
  getMonetizationCatalog,
  getMonetizationStripePriceIdForSku,
  type MonetizationCatalogItem,
} from "@/lib/monetization/catalog"

type ApiMonetizationCatalogItem = MonetizationCatalogItem & {
  stripePriceId: string | null
  stripePriceConfigured: boolean
}

function mapCatalogItem(item: MonetizationCatalogItem): ApiMonetizationCatalogItem {
  const stripePriceId = getMonetizationStripePriceIdForSku(item.sku)
  return {
    ...item,
    stripePriceId,
    stripePriceConfigured: Boolean(stripePriceId),
  }
}

export async function GET() {
  const catalog = getMonetizationCatalog()

  return NextResponse.json(
    {
      catalog: {
        subscriptions: catalog.subscriptions.map(mapCatalogItem),
        tokenPacks: catalog.tokenPacks.map(mapCatalogItem),
        all: catalog.all.map(mapCatalogItem),
      },
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
