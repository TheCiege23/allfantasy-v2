import { NextResponse } from "next/server"
import { getSeasonsWithRecords } from "@/lib/record-book-engine/RecordQueryService"

export const dynamic = "force-dynamic"

/**
 * GET /api/leagues/[leagueId]/record-book/seasons
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  try {
    const { leagueId } = await ctx.params
    if (!leagueId) return NextResponse.json({ error: "Missing leagueId" }, { status: 400 })

    const seasons = await getSeasonsWithRecords(leagueId)
    return NextResponse.json({ leagueId, seasons })
  } catch (e) {
    console.error("[record-book/seasons GET]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: "Failed to load seasons" },
      { status: 500 }
    )
  }
}
