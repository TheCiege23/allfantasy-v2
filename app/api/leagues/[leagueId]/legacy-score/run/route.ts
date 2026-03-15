import { NextResponse } from "next/server"
import { runLegacyScoreEngineForLeague } from "@/lib/legacy-score-engine/LegacyScoreEngine"

export const dynamic = "force-dynamic"

/**
 * POST /api/leagues/[leagueId]/legacy-score/run
 * Run legacy score engine for all managers in the league.
 */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  try {
    const { leagueId } = await ctx.params
    if (!leagueId) return NextResponse.json({ error: "Missing leagueId" }, { status: 400 })

    const { processed, results } = await runLegacyScoreEngineForLeague(leagueId, {
      replace: true,
    })
    return NextResponse.json({
      ok: true,
      leagueId,
      processed,
      results: results.slice(0, 50),
    })
  } catch (e) {
    console.error("[legacy-score/run POST]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: "Failed to run legacy score engine" },
      { status: 500 }
    )
  }
}
