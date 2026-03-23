import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { runRecordBookEngine } from "@/lib/record-book-engine/RecordBookEngine"
import { assertLeagueMember } from "@/lib/league-access"
import { isSupportedSport, normalizeToSupportedSport } from "@/lib/sport-scope"

export const dynamic = "force-dynamic"

/**
 * POST /api/leagues/[leagueId]/record-book/run
 * Body: { seasons: string[], sport?: string }. Generates record book entries.
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

    const body = (await req.json().catch(() => ({}))) as {
      seasons?: unknown
      season?: unknown
      sport?: unknown
    }
    const seasonsInput: unknown[] = Array.isArray(body.seasons) ? body.seasons : [body.season]
    const seasons: string[] = seasonsInput
      .map((s: unknown) => String(s ?? "").trim())
      .filter((s: string) => s.length > 0)
    const sportRaw = typeof body.sport === "string" ? body.sport : undefined
    const sport =
      sportRaw == null
        ? undefined
        : isSupportedSport(sportRaw)
          ? normalizeToSupportedSport(sportRaw)
          : null
    if (sport === null) {
      return NextResponse.json({ error: "Invalid sport" }, { status: 400 })
    }
    if (sport && sport !== access.leagueSport) {
      return NextResponse.json({ error: "Sport does not match league sport" }, { status: 400 })
    }
    const seasonsToRun =
      seasons.length > 0 ? Array.from(new Set(seasons)) : [new Date().getFullYear().toString()]
    if (seasonsToRun.length > 20) {
      return NextResponse.json({ error: "Too many seasons requested (max 20)" }, { status: 400 })
    }

    const result = await runRecordBookEngine(leagueId, seasonsToRun, { sport: access.leagueSport })
    return NextResponse.json(result)
  } catch (e) {
    console.error("[record-book/run POST]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: "Failed to run record book engine" },
      { status: 500 }
    )
  }
}
