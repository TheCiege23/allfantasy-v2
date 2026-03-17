import { NextRequest, NextResponse } from "next/server"
import { discoverLeagues } from "@/lib/league-discovery"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams
    const query = sp.get("q") ?? sp.get("query") ?? null
    const sport = sp.get("sport") ?? null
    const leagueType = sp.get("leagueType") ?? sp.get("scoringMode") ?? null
    const entryFee = sp.get("entryFee") ?? null
    const visibility = sp.get("visibility") ?? null
    const difficulty = sp.get("difficulty") ?? null
    const page = sp.get("page") ?? "1"
    const limit = sp.get("limit") ?? "20"

    const result = await discoverLeagues({
      query,
      sport,
      leagueType,
      entryFee,
      visibility,
      difficulty,
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20,
    })

    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    })
  } catch (err: any) {
    console.error("[bracket/discover]", err)
    return NextResponse.json(
      { error: err?.message ?? "Discovery failed" },
      { status: 500 }
    )
  }
}
