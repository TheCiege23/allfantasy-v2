import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { assertLeagueMember } from "@/lib/league-access"
import {
  getAwardByIdInLeague,
  listAwards,
  resolveAwardExplanation,
} from "@/lib/awards-engine/AwardQueryService"
import { AWARD_TYPES } from "@/lib/awards-engine/types"

export const dynamic = "force-dynamic"

/**
 * POST /api/leagues/[leagueId]/awards/explain
 * Body: { awardId?: string, season?: string, awardType?: string }.
 * If awardId: explain that award. Else if season+awardType: find first matching and explain.
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
    try {
      await assertLeagueMember(leagueId, session.user.id)
    } catch {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const awardId = body.awardId as string | undefined
    const season = body.season as string | undefined
    const awardTypeRaw = body.awardType as string | undefined
    const awardType =
      awardTypeRaw == null
        ? undefined
        : (AWARD_TYPES as readonly string[]).includes(awardTypeRaw)
          ? awardTypeRaw
          : null
    if (awardTypeRaw != null && awardType === null) {
      return NextResponse.json({ error: "Invalid awardType" }, { status: 400 })
    }

    let record = null
    if (awardId) {
      record = await getAwardByIdInLeague(leagueId, awardId)
    } else if (season && awardType) {
      const list = await listAwards({ leagueId, season, awardType, limit: 1 })
      record = list[0] ?? null
    }
    if (!record) {
      return NextResponse.json({
        leagueId,
        narrative: "No award found. Run the awards engine for this league and season, or provide a valid awardId.",
        source: "none",
      })
    }

    const narrative = await resolveAwardExplanation(record)
    return NextResponse.json({
      leagueId,
      awardId: record.awardId,
      narrative,
      source: "awards_engine",
      awardLabel: record.awardLabel,
      managerId: record.managerId,
      score: record.score,
      season: record.season,
    })
  } catch (e) {
    console.error("[awards/explain POST]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: "Failed to explain award" },
      { status: 500 }
    )
  }
}
