import { NextResponse } from "next/server"
import { listAwards } from "@/lib/awards-engine/AwardQueryService"

export const dynamic = "force-dynamic"

/**
 * GET /api/leagues/[leagueId]/awards?season=&awardType=&limit=
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  try {
    const { leagueId } = await ctx.params
    if (!leagueId) return NextResponse.json({ error: "Missing leagueId" }, { status: 400 })

    const url = new URL(req.url)
    const season = url.searchParams.get("season") ?? undefined
    const awardType = url.searchParams.get("awardType") ?? undefined
    const limitParam = url.searchParams.get("limit")
    const limit = limitParam != null ? Math.min(parseInt(limitParam, 10) || 50, 200) : 100

    const awards = await listAwards({ leagueId, season, awardType, limit })
    return NextResponse.json({ leagueId, awards })
  } catch (e) {
    console.error("[awards GET]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: "Failed to load awards" },
      { status: 500 }
    )
  }
}
