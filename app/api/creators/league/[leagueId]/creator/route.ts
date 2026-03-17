import { NextRequest, NextResponse } from "next/server"
import { getCreatorForLeague } from "@/lib/creator"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  try {
    const { leagueId } = await params
    if (!leagueId) return NextResponse.json({ error: "Missing leagueId" }, { status: 400 })

    const creator = await getCreatorForLeague(leagueId)
    if (!creator) return NextResponse.json({ creator: null })
    return NextResponse.json({ ok: true, creator })
  } catch (err: any) {
    console.error("[creators/league/[leagueId]/creator]", err)
    return NextResponse.json({ error: err?.message ?? "Failed" }, { status: 500 })
  }
}
