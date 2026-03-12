import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { computeTournamentPickPopularity } from "@/lib/brackets/popularity"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as any
    let { tournamentId } = body || {}

    if (!tournamentId) {
      const latest = await prisma.bracketTournament.findFirst({
        orderBy: { createdAt: "desc" },
        select: { id: true },
      })
      tournamentId = latest?.id
    }

    if (!tournamentId) {
      return NextResponse.json(
        { error: "No tournamentId provided and no tournaments found" },
        { status: 400 },
      )
    }

    const result = await computeTournamentPickPopularity(tournamentId)

    return NextResponse.json({
      ok: true,
      tournamentId,
      updatedGlobal: result.global,
      updatedLeague: result.league,
    })
  } catch (err: any) {
    console.error("[workers/popularity] Error:", err)
    return NextResponse.json(
      { error: "Failed to compute popularity" },
      { status: 500 },
    )
  }
}

