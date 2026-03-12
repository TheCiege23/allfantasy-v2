import { NextRequest, NextResponse } from "next/server"
import { computeTournamentChaos } from "@/lib/brackets/chaos"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const tournamentId = searchParams.get("tournamentId")

    if (!tournamentId) {
      return NextResponse.json({ error: "tournamentId is required" }, { status: 400 })
    }

    const metrics = await computeTournamentChaos(tournamentId)

    return NextResponse.json({
      ok: true,
      ...metrics,
    })
  } catch (err: any) {
    console.error("[bracket/chaos] Error:", err)
    return NextResponse.json(
      { error: err?.message || "Failed to compute chaos score" },
      { status: 500 },
    )
  }
}

