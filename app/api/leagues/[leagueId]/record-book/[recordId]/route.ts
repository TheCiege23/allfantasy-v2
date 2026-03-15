import { NextResponse } from "next/server"
import { getRecordById } from "@/lib/record-book-engine/RecordQueryService"

export const dynamic = "force-dynamic"

/**
 * GET /api/leagues/[leagueId]/record-book/[recordId]
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ leagueId: string; recordId: string }> }
) {
  try {
    const { recordId } = await ctx.params
    if (!recordId) return NextResponse.json({ error: "Missing recordId" }, { status: 400 })

    const record = await getRecordById(recordId)
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
