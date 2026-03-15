import { NextResponse } from "next/server"
import { getAwardById } from "@/lib/awards-engine/AwardQueryService"

export const dynamic = "force-dynamic"

/**
 * GET /api/leagues/[leagueId]/awards/[awardId]
 * Returns single award record for detail page.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ leagueId: string; awardId: string }> }
) {
  try {
    const { awardId } = await ctx.params
    if (!awardId) return NextResponse.json({ error: "Missing awardId" }, { status: 400 })

    const award = await getAwardById(awardId)
    if (!award) return NextResponse.json({ error: "Award not found" }, { status: 404 })
    return NextResponse.json(award)
  } catch (e) {
    console.error("[awards/[awardId] GET]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: "Failed to load award" },
      { status: 500 }
    )
  }
}
