import { NextResponse } from "next/server"
import { getAwardById, listAwards, buildAwardExplanation } from "@/lib/awards-engine/AwardQueryService"

export const dynamic = "force-dynamic"

/**
 * POST /api/leagues/[leagueId]/awards/explain
 * Body: { awardId?: string, season?: string, awardType?: string }.
 * If awardId: explain that award. Else if season+awardType: find first matching and explain.
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  try {
    const { leagueId } = await ctx.params
    if (!leagueId) return NextResponse.json({ error: "Missing leagueId" }, { status: 400 })

    const body = await req.json().catch(() => ({}))
    const awardId = body.awardId as string | undefined
    const season = body.season as string | undefined
    const awardType = body.awardType as string | undefined

    let record = null
    if (awardId) {
      record = await getAwardById(awardId)
    } else if (season && awardType) {
      const list = await listAwards({ leagueId, season, awardType, limit: 1 })
      record = list[0] ?? null
    }
    if (!record) {
      return NextResponse.json({
        leagueId,
        narrative: "No award found. Run the awards engine for this league and season, or provide a valid awardId.",
        source: "none",
      })
    }

    const narrative = buildAwardExplanation(record)
    return NextResponse.json({
      leagueId,
      awardId: record.awardId,
      narrative,
      source: "awards_engine",
      awardLabel: record.awardLabel,
      managerId: record.managerId,
      score: record.score,
      season: record.season,
    })
  } catch (e) {
    console.error("[awards/explain POST]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: "Failed to explain award" },
      { status: 500 }
    )
  }
}
