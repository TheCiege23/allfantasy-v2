import { NextResponse } from "next/server"
import { getRecordById, buildRecordExplanation } from "@/lib/record-book-engine/RecordQueryService"

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
    const body = await req.json().catch(() => ({}))
    const recordId = body.recordId as string
    if (!recordId) {
      return NextResponse.json({ error: "Missing recordId" }, { status: 400 })
    }

    const record = await getRecordById(recordId)
    if (!record) {
      return NextResponse.json({
        narrative: "Record not found.",
        source: "none",
      })
    }

    const narrative = buildRecordExplanation(record)
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
