import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { assertLeagueMember } from "@/lib/league-access"
import { buildCareerContextForManager, buildCareerContextForLeague } from "@/lib/career-prestige/AICareerContextService"
import { isSupportedSport, normalizeToSupportedSport } from "@/lib/sport-scope"

export const dynamic = "force-dynamic"

/**
 * POST /api/career-prestige/explain
 * Body: { managerId?, leagueId?, sport? }. If managerId: explain manager career; else if leagueId: explain league prestige.
 */
export async function POST(req: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const managerId = body.managerId as string | undefined
    const leagueId = body.leagueId as string | undefined
    const sportRaw = body.sport as string | undefined
    const sport =
      sportRaw == null
        ? undefined
        : isSupportedSport(sportRaw)
          ? normalizeToSupportedSport(sportRaw)
          : null
    if (sport === null) {
      return NextResponse.json({ error: "Invalid sport" }, { status: 400 })
    }

    if (managerId) {
      if (managerId !== session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      let effectiveSport = sport
      if (leagueId) {
        let access: { leagueSport: string }
        try {
          access = await assertLeagueMember(leagueId, session.user.id)
        } catch {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }
        if (sport && sport !== access.leagueSport) {
          return NextResponse.json({ error: "Sport must match league sport" }, { status: 400 })
        }
        effectiveSport = sport ?? normalizeToSupportedSport(access.leagueSport)
      }
      const context = await buildCareerContextForManager(managerId, { leagueId, sport: effectiveSport })
      return NextResponse.json({
        type: "manager",
        managerId,
        narrative: context.narrativeHint,
        context,
        source: "career_prestige",
      })
    }
    if (leagueId) {
      let access: { leagueSport: string }
      try {
        access = await assertLeagueMember(leagueId, session.user.id)
      } catch {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      if (sport && sport !== access.leagueSport) {
        return NextResponse.json({ error: "Sport must match league sport" }, { status: 400 })
      }
      const result = await buildCareerContextForLeague(
        leagueId,
        sport ?? normalizeToSupportedSport(access.leagueSport)
      )
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
