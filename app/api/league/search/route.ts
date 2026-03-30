/**
 * GET /api/league/search?leagueName=&commissioner=&sport=&leagueType=&limit=&offset=
 * Fast league search by name, commissioner, sport, league type.
 */

import { NextRequest, NextResponse } from "next/server"
import { searchLeagues } from "@/lib/league-search"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams
    const query = sp.get("q") ?? null
    const leagueName = sp.get("leagueName") ?? null
    const commissioner = sp.get("commissioner") ?? null
    const sport = sp.get("sport") ?? null
    const leagueType = sp.get("leagueType") ?? null
    const limit = sp.get("limit")
    const offset = sp.get("offset")

    const result = await searchLeagues({
      query: query || undefined,
      leagueName: leagueName || undefined,
      commissioner: commissioner || undefined,
      sport: sport || undefined,
      leagueType: leagueType || undefined,
      limit: limit != null ? parseInt(limit, 10) : undefined,
      offset: offset != null ? parseInt(offset, 10) : undefined,
    })

    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" },
    })
  } catch (e) {
    console.error("[league/search]", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Search failed" },
      { status: 500 }
    )
  }
}
