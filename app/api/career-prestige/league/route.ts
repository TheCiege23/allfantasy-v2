import { NextResponse } from "next/server"
import { getLeaguePrestigeSummary } from "@/lib/career-prestige/UnifiedCareerQueryService"

export const dynamic = "force-dynamic"

/**
 * GET /api/career-prestige/league?leagueId=&sport=
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const leagueId = url.searchParams.get("leagueId")
    if (!leagueId) return NextResponse.json({ error: "Missing leagueId" }, { status: 400 })
    const sport = url.searchParams.get("sport") ?? undefined

    const summary = await getLeaguePrestigeSummary(leagueId, sport)
    return NextResponse.json(summary)
  } catch (e) {
    console.error("[career-prestige/league GET]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: "Failed to load league prestige" },
      { status: 500 }
    )
  }
}
