import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getRecommendations } from "@/lib/user-recommendation-engine"

export const dynamic = "force-dynamic"

/**
 * GET /api/recommendations
 * Returns personalized recommendations: leagues, players, strategies.
 * Requires auth. Query: leagueLimit, playerLimit, sport, profile=1 (include _profile in response).
 */
export async function GET(req: NextRequest) {
  const session = (await getServerSession(authOptions as any)) as {
    user?: { id?: string }
  } | null
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const leagueLimit = searchParams.get("leagueLimit")
    ? parseInt(searchParams.get("leagueLimit")!, 10)
    : undefined
  const playerLimit = searchParams.get("playerLimit")
    ? parseInt(searchParams.get("playerLimit")!, 10)
    : undefined
  const sport = searchParams.get("sport") ?? null
  const includeProfile = searchParams.get("profile") === "1"

  try {
    const data = await getRecommendations(userId, {
      leagueLimit: leagueLimit && leagueLimit > 0 ? Math.min(leagueLimit, 24) : undefined,
      playerLimit: playerLimit && playerLimit > 0 ? Math.min(playerLimit, 50) : undefined,
      sport,
      includeProfile,
    })

    return NextResponse.json(data)
  } catch (e) {
    console.error("[recommendations] GET error:", e)
    return NextResponse.json(
      { error: "Failed to load recommendations" },
      { status: 500 }
    )
  }
}
