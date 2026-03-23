import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { assertLeagueMember } from "@/lib/league-access"
import { getRecordByIdInLeague } from "@/lib/record-book-engine/RecordQueryService"

export const dynamic = "force-dynamic"

/**
 * GET /api/leagues/[leagueId]/record-book/[recordId]
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ leagueId: string; recordId: string }> }
) {
  try {
    const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { leagueId, recordId } = await ctx.params
    if (!leagueId) return NextResponse.json({ error: "Missing leagueId" }, { status: 400 })
    if (!recordId) return NextResponse.json({ error: "Missing recordId" }, { status: 400 })
    try {
      await assertLeagueMember(leagueId, session.user.id)
    } catch {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const record = await getRecordByIdInLeague(leagueId, recordId)
    if (!record) return NextResponse.json({ error: "Record not found" }, { status: 404 })
    return NextResponse.json(record)
  } catch (e) {
    console.error("[record-book/[recordId] GET]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: "Failed to load record" },
      { status: 500 }
    )
  }
}
