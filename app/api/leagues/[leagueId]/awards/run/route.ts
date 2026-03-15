import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { runAwardsEngine } from "@/lib/awards-engine/AwardsEngine"

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

    const body = await req.json().catch(() => ({}))
    const season = body.season as string
    const sport = body.sport as string | undefined

    if (!season || typeof season !== "string") {
      return NextResponse.json({ error: "Missing or invalid season" }, { status: 400 })
    }

    const result = await runAwardsEngine(leagueId, season, { sport })
    return NextResponse.json(result)
  } catch (e) {
    console.error("[awards/run POST]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: "Failed to run awards engine" },
      { status: 500 }
    )
  }
}
