import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getPersonalizedRecommendations } from "@/lib/league-recommendations"
import { getRecommendedLeagues } from "@/lib/public-discovery"

export const dynamic = "force-dynamic"

function getBaseUrl(req: NextRequest): string {
  return req.headers.get("x-forwarded-host")
    ? `${req.headers.get("x-forwarded-proto") || "https"}://${req.headers.get("x-forwarded-host")}`
    : process.env.NEXTAUTH_URL ?? "https://allfantasy.ai"
}

/**
 * GET: Personalized league recommendations when user is logged in (favorite sports,
 * past leagues, draft participation, league types). Falls back to generic "filling fast"
 * recommendations when anonymous.
 */
export async function GET(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
    const userId = session?.user?.id ?? null
    const sport = req.nextUrl.searchParams.get("sport") ?? null
    const limit = Math.min(24, Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") ?? "6", 10)))
    const baseUrl = getBaseUrl(req)

    if (userId) {
      const results = await getPersonalizedRecommendations(userId, baseUrl, { limit, sport })
      return NextResponse.json(
        {
          ok: true,
          personalized: true,
          leagues: results.map((r) => ({ league: r.league, explanation: r.explanation })),
        },
        { headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=120" } }
      )
    }

    const leagues = await getRecommendedLeagues(limit, sport || null, baseUrl)
    return NextResponse.json(
      { ok: true, personalized: false, leagues: leagues.map((l) => ({ league: l, explanation: null })) },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } }
    )
  } catch (err: unknown) {
    console.error("[discover/recommendations]", err)
    return NextResponse.json({ error: "Failed to load recommendations" }, { status: 500 })
  }
}
