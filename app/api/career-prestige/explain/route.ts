import { NextResponse } from "next/server"
import { buildCareerContextForManager, buildCareerContextForLeague } from "@/lib/career-prestige/AICareerContextService"

export const dynamic = "force-dynamic"

/**
 * POST /api/career-prestige/explain
 * Body: { managerId?, leagueId?, sport? }. If managerId: explain manager career; else if leagueId: explain league prestige.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const managerId = body.managerId as string | undefined
    const leagueId = body.leagueId as string | undefined
    const sport = body.sport as string | undefined

    if (managerId) {
      const context = await buildCareerContextForManager(managerId, { leagueId, sport })
      return NextResponse.json({
        type: "manager",
        managerId,
        narrative: context.narrativeHint,
        context,
        source: "career_prestige",
      })
    }
    if (leagueId) {
      const result = await buildCareerContextForLeague(leagueId, sport)
      return NextResponse.json({
        type: "league",
        leagueId,
        narrative: result.narrativeHint,
        summary: result.summary,
        source: "career_prestige",
      })
    }
    return NextResponse.json({ error: "Provide managerId or leagueId" }, { status: 400 })
  } catch (e) {
    console.error("[career-prestige/explain POST]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: "Failed to build career explanation" },
      { status: 500 }
    )
  }
}
