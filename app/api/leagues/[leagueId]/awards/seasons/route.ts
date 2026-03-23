import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { assertLeagueMember } from "@/lib/league-access"
import { getSeasonsWithAwards } from "@/lib/awards-engine/AwardQueryService"

export const dynamic = "force-dynamic"

/**
 * GET /api/leagues/[leagueId]/awards/seasons
 * Returns list of seasons that have at least one award.
 */
export async function GET(
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

    const seasons = await getSeasonsWithAwards(leagueId)
    return NextResponse.json({ leagueId, seasons })
  } catch (e) {
    console.error("[awards/seasons GET]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: "Failed to load seasons" },
      { status: 500 }
    )
  }
}
