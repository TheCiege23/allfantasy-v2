import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { assertLeagueMember } from "@/lib/league-access"
import { getAwardByIdInLeague } from "@/lib/awards-engine/AwardQueryService"

export const dynamic = "force-dynamic"

/**
 * GET /api/leagues/[leagueId]/awards/[awardId]
 * Returns single award record for detail page.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ leagueId: string; awardId: string }> }
) {
  try {
    const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { leagueId, awardId } = await ctx.params
    if (!leagueId) return NextResponse.json({ error: "Missing leagueId" }, { status: 400 })
    if (!awardId) return NextResponse.json({ error: "Missing awardId" }, { status: 400 })
    try {
      await assertLeagueMember(leagueId, session.user.id)
    } catch {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const award = await getAwardByIdInLeague(leagueId, awardId)
    if (!award) return NextResponse.json({ error: "Award not found" }, { status: 404 })
    return NextResponse.json(award)
  } catch (e) {
    console.error("[awards/[awardId] GET]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: "Failed to load award" },
      { status: 500 }
    )
  }
}
