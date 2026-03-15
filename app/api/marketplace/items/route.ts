import { NextResponse } from "next/server"
import { listMarketplaceItems, listMarketplaceItemsForSport } from "@/lib/league-economy/MarketplaceService"
import { normalizeToSupportedSport } from "@/lib/sport-scope"

export const dynamic = "force-dynamic"

/**
 * GET /api/marketplace/items?sport=&cosmeticCategory=&limit=
 * When sport is set: items for that sport or unrestricted. When empty: all items.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const sportParam = url.searchParams.get("sport")
    const sport = sportParam ? normalizeToSupportedSport(sportParam) : undefined
    const cosmeticCategory = url.searchParams.get("cosmeticCategory") ?? undefined
    const limitParam = url.searchParams.get("limit")
    const limit = limitParam != null ? Math.min(parseInt(limitParam, 10) || 50, 200) : 100

    const items = sport
      ? await listMarketplaceItemsForSport(sport, { cosmeticCategory, limit })
      : await listMarketplaceItems({ cosmeticCategory, limit })
    return NextResponse.json({ items })
  } catch (e) {
    console.error("[marketplace/items GET]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: "Failed to load marketplace items" },
      { status: 500 }
    )
  }
}
