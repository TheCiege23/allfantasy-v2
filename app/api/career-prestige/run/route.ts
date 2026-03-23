import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { runAllForLeague, runAllForManager } from "@/lib/career-prestige/CareerPrestigeOrchestrator"
import { assertLeagueMember } from "@/lib/league-access"
import { isSupportedSport, normalizeToSupportedSport } from "@/lib/sport-scope"

export const dynamic = "force-dynamic"

/**
 * POST /api/career-prestige/run
 * Body: { leagueId?, managerId?, sport?, seasons? }. Run all career engines for league or manager.
 */
export async function POST(req: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const leagueId = body.leagueId as string | undefined
    const managerId = body.managerId as string | undefined
    const sportRaw = body.sport as string | undefined
    const sport =
      sportRaw == null
        ? undefined
        : isSupportedSport(sportRaw)
          ? normalizeToSupportedSport(sportRaw)
          : null
    const seasons =
      Array.isArray(body.seasons)
        ? body.seasons.map((season: unknown) => String(season ?? "").trim()).filter((season: string) => season.length > 0)
        : undefined
    if (sport === null) {
      return NextResponse.json({ error: "Invalid sport" }, { status: 400 })
    }

    if (leagueId) {
      let access: { leagueSport: string; isCommissioner: boolean }
      try {
        access = await assertLeagueMember(leagueId, session.user.id)
      } catch {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      if (!access.isCommissioner) {
        return NextResponse.json({ error: "Forbidden: commissioner only" }, { status: 403 })
      }
      if (sport && sport !== access.leagueSport) {
        return NextResponse.json({ error: "Sport must match league sport" }, { status: 400 })
      }
      const result = await runAllForLeague(leagueId, { sport: sport ?? access.leagueSport, seasons })
      return NextResponse.json(result)
    }
    if (managerId) {
      if (managerId !== session.user.id) {
        return NextResponse.json({ error: "Forbidden: can only run own managerId" }, { status: 403 })
      }
      const result = await runAllForManager(managerId, { sport })
      return NextResponse.json(result)
    }
    return NextResponse.json({ error: "Provide leagueId or managerId" }, { status: 400 })
  } catch (e) {
    console.error("[career-prestige/run POST]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: "Failed to run career prestige" },
      { status: 500 }
    )
  }
}
