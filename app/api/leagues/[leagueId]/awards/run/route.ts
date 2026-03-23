import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { runAwardsEngine } from "@/lib/awards-engine/AwardsEngine"
import { assertLeagueMember } from "@/lib/league-access"
import { isSupportedSport, normalizeToSupportedSport } from "@/lib/sport-scope"

export const dynamic = "force-dynamic"

/**
 * POST /api/leagues/[leagueId]/awards/run
 * Body: { season: string, sport?: string }. Generates awards for that league+season.
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  try {
    const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { leagueId } = await ctx.params
    if (!leagueId) return NextResponse.json({ error: "Missing leagueId" }, { status: 400 })
    let access
    try {
      access = await assertLeagueMember(leagueId, session.user.id)
    } catch {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    if (!access.isCommissioner) {
      return NextResponse.json({ error: "Forbidden: commissioner only" }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const season = typeof body.season === "string" ? body.season.trim() : ""
    const sportRaw = body.sport as string | undefined
    const sport =
      sportRaw == null
        ? undefined
        : isSupportedSport(sportRaw)
          ? normalizeToSupportedSport(sportRaw)
          : null

    if (!season || typeof season !== "string") {
      return NextResponse.json({ error: "Missing or invalid season" }, { status: 400 })
    }
    if (sport === null) {
      return NextResponse.json({ error: "Invalid sport" }, { status: 400 })
    }
    if (sport && sport !== access.leagueSport) {
      return NextResponse.json({ error: "Sport does not match league sport" }, { status: 400 })
    }

    const result = await runAwardsEngine(leagueId, season, { sport: access.leagueSport })
    return NextResponse.json(result)
  } catch (e) {
    console.error("[awards/run POST]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: "Failed to run awards engine" },
      { status: 500 }
    )
  }
}
