import { NextResponse } from "next/server"
import { queryHallOfFameEntries } from "@/lib/hall-of-fame-engine/HallOfFameQueryService"

export const dynamic = "force-dynamic"

/**
 * GET /api/hall-of-fame/entries
 * Query: sport?, leagueId?, season?, category?, entityType?, entityId?, limit?, offset?
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const sport = url.searchParams.get("sport")
    const leagueId = url.searchParams.get("leagueId")
    const season = url.searchParams.get("season")
    const category = url.searchParams.get("category")
    const entityType = url.searchParams.get("entityType")
    const entityId = url.searchParams.get("entityId")
    const limit = url.searchParams.get("limit")
    const offset = url.searchParams.get("offset")

    const { entries, total } = await queryHallOfFameEntries({
      sport: sport ?? null,
      leagueId: leagueId ?? null,
      season: season ?? null,
      category: category ?? null,
      entityType: entityType ?? null,
      entityId: entityId ?? null,
      limit: limit ? parseInt(limit, 10) : 60,
      offset: offset ? parseInt(offset, 10) : 0,
    })

    return NextResponse.json({ entries, total })
  } catch (e) {
    console.error("[HallOfFame platform entries GET]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: "Unable to load Hall of Fame entries." },
      { status: 500 }
    )
  }
}
