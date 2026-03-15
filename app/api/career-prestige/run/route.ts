import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { runAllForLeague, runAllForManager } from "@/lib/career-prestige/CareerPrestigeOrchestrator"

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
    const sport = body.sport as string | undefined
    const seasons = Array.isArray(body.seasons) ? body.seasons : undefined

    if (leagueId) {
      const result = await runAllForLeague(leagueId, { sport, seasons })
      return NextResponse.json(result)
    }
    if (managerId) {
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
