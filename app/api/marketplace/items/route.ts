import { NextResponse } from "next/server"
import { listMarketplaceItems, listMarketplaceItemsForSport } from "@/lib/league-economy/MarketplaceService"
import { isSupportedSport, normalizeToSupportedSport } from "@/lib/sport-scope"
import { COSMETIC_CATEGORIES } from "@/lib/league-economy/types"

export const dynamic = "force-dynamic"

/**
 * GET /api/marketplace/items?sport=&cosmeticCategory=&limit=
 * When sport is set: items for that sport or unrestricted. When empty: all items.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const sportParam = url.searchParams.get("sport")
    const sport =
      sportParam == null
        ? undefined
        : isSupportedSport(sportParam)
          ? normalizeToSupportedSport(sportParam)
          : null
    if (sport === null) {
      return NextResponse.json({ error: "Invalid sport" }, { status: 400 })
    }
    const cosmeticCategory = url.searchParams.get("cosmeticCategory") ?? undefined
    if (
      cosmeticCategory &&
      !(COSMETIC_CATEGORIES as readonly string[]).includes(cosmeticCategory)
    ) {
      return NextResponse.json({ error: "Invalid cosmeticCategory" }, { status: 400 })
    }
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
