import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { assertLeagueMember } from "@/lib/league-access"
import {
  getRecordByIdInLeague,
  resolveRecordExplanation,
} from "@/lib/record-book-engine/RecordQueryService"

export const dynamic = "force-dynamic"

/**
 * POST /api/leagues/[leagueId]/record-book/explain
 * Body: { recordId: string }.
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
    const recordId = body.recordId as string
    if (!recordId) {
      return NextResponse.json({ error: "Missing recordId" }, { status: 400 })
    }

    const record = await getRecordByIdInLeague(leagueId, recordId)
    if (!record) {
      return NextResponse.json({
        leagueId,
        narrative: "Record not found.",
        source: "none",
      })
    }

    const narrative = await resolveRecordExplanation(record)
    return NextResponse.json({
      leagueId: record.leagueId,
      recordId: record.recordId,
      narrative,
      source: "record_book",
      recordLabel: record.recordLabel,
      holderId: record.holderId,
      value: record.value,
      season: record.season,
    })
  } catch (e) {
    console.error("[record-book/explain POST]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: "Failed to explain record" },
      { status: 500 }
    )
  }
}
