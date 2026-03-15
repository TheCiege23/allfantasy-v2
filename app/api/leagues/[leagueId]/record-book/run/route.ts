import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { runRecordBookEngine } from "@/lib/record-book-engine/RecordBookEngine"

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

    const body = await req.json().catch(() => ({}))
    const seasons = Array.isArray(body.seasons) ? body.seasons : [String(body.season ?? new Date().getFullYear())]
    const sport = body.sport as string | undefined

    const result = await runRecordBookEngine(leagueId, seasons, { sport })
    return NextResponse.json(result)
  } catch (e) {
    console.error("[record-book/run POST]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: "Failed to run record book engine" },
      { status: 500 }
    )
  }
}
