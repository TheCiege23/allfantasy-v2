import { NextResponse } from "next/server"
import { queryHallOfFameMoments } from "@/lib/hall-of-fame-engine/HallOfFameQueryService"

export const dynamic = "force-dynamic"

/**
 * GET /api/hall-of-fame/moments
 * Query: sport?, leagueId?, season?, limit?, offset?
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const sport = url.searchParams.get("sport")
    const leagueId = url.searchParams.get("leagueId")
    const season = url.searchParams.get("season")
    const limit = url.searchParams.get("limit")
    const offset = url.searchParams.get("offset")

    const { moments, total } = await queryHallOfFameMoments({
      sport: sport ?? null,
      leagueId: leagueId ?? null,
      season: season ?? null,
      limit: limit ? parseInt(limit, 10) : 60,
      offset: offset ? parseInt(offset, 10) : 0,
    })

    return NextResponse.json({ moments, total })
  } catch (e) {
    console.error("[HallOfFame platform moments GET]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: "Unable to load Hall of Fame moments." },
      { status: 500 }
    )
  }
}
