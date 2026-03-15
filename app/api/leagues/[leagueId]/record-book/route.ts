import { NextResponse } from "next/server"
import { getRecordLeaderboard } from "@/lib/record-book-engine/RecordLeaderboardService"

export const dynamic = "force-dynamic"

/**
 * GET /api/leagues/[leagueId]/record-book?recordType=&season=&sport=&limit=
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  try {
    const { leagueId } = await ctx.params
    if (!leagueId) return NextResponse.json({ error: "Missing leagueId" }, { status: 400 })

    const url = new URL(req.url)
    const recordType = url.searchParams.get("recordType") ?? undefined
    const season = url.searchParams.get("season") ?? undefined
    const sport = url.searchParams.get("sport") ?? undefined
    const limitParam = url.searchParams.get("limit")
    const limit = limitParam != null ? Math.min(parseInt(limitParam, 10) || 50, 200) : 50

    const leaderboard = await getRecordLeaderboard({
      leagueId,
      recordType,
      season,
      sport,
      limit,
    })
    return NextResponse.json({ leagueId, records: leaderboard })
  } catch (e) {
    console.error("[record-book GET]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: "Failed to load record book" },
      { status: 500 }
    )
  }
}
