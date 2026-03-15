import { NextResponse } from "next/server"
import { getCareerLeaderboard } from "@/lib/career-prestige/UnifiedCareerQueryService"

export const dynamic = "force-dynamic"

/**
 * GET /api/career-prestige/leaderboard?leagueId=&sport=&limit=
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const leagueId = url.searchParams.get("leagueId") ?? undefined
    const sport = url.searchParams.get("sport") ?? undefined
    const limitParam = url.searchParams.get("limit")
    const limit = limitParam != null ? Math.min(parseInt(limitParam, 10) || 50, 100) : 50

    const leaderboard = await getCareerLeaderboard({ leagueId, sport, limit })
    return NextResponse.json({ leaderboard })
  } catch (e) {
    console.error("[career-prestige/leaderboard GET]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: "Failed to load career leaderboard" },
      { status: 500 }
    )
  }
}
