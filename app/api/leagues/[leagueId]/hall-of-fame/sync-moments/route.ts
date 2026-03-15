import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { syncHistoricMomentsForLeague } from "@/lib/hall-of-fame-engine/HallOfFameService"

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  try {
    const { leagueId } = await ctx.params
    if (!leagueId) return NextResponse.json({ error: "Missing leagueId" }, { status: 400 })

    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      select: { sport: true },
    })
    const sport = league?.sport ?? "NFL"
    const sportStr = typeof sport === "string" ? sport : String(sport)

    const { created } = await syncHistoricMomentsForLeague(leagueId, sportStr)
    return NextResponse.json({ ok: true, leagueId, created })
  } catch (e) {
    console.error("[HallOfFame sync-moments POST]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: "Unable to sync Hall of Fame moments." },
      { status: 500 }
    )
  }
}
