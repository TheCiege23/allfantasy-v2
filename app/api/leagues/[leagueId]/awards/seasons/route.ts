import { NextResponse } from "next/server"
import { getSeasonsWithAwards } from "@/lib/awards-engine/AwardQueryService"

export const dynamic = "force-dynamic"

/**
 * GET /api/leagues/[leagueId]/awards/seasons
 * Returns list of seasons that have at least one award.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  try {
    const { leagueId } = await ctx.params
    if (!leagueId) return NextResponse.json({ error: "Missing leagueId" }, { status: 400 })

    const seasons = await getSeasonsWithAwards(leagueId)
    return NextResponse.json({ leagueId, seasons })
  } catch (e) {
    console.error("[awards/seasons GET]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: "Failed to load seasons" },
      { status: 500 }
    )
  }
}
