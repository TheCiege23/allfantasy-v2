import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { assertLeagueMember } from "@/lib/league-access"
import { getLeaguePrestigeSummary } from "@/lib/career-prestige/UnifiedCareerQueryService"
import { isSupportedSport, normalizeToSupportedSport } from "@/lib/sport-scope"

export const dynamic = "force-dynamic"

/**
 * GET /api/career-prestige/league?leagueId=&sport=
 */
export async function GET(req: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const url = new URL(req.url)
    const leagueId = url.searchParams.get("leagueId")
    if (!leagueId) return NextResponse.json({ error: "Missing leagueId" }, { status: 400 })
    try {
      await assertLeagueMember(leagueId, session.user.id)
    } catch {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    const sportRaw = url.searchParams.get("sport")
    const sport =
      sportRaw == null
        ? undefined
        : isSupportedSport(sportRaw)
          ? normalizeToSupportedSport(sportRaw)
          : null
    if (sport === null) {
      return NextResponse.json({ error: "Invalid sport" }, { status: 400 })
    }

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
