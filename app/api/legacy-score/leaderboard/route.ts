import { NextResponse } from "next/server"
import { queryLegacyLeaderboard } from "@/lib/legacy-score-engine/LegacyRankingService"
import { normalizeToSupportedSport } from "@/lib/sport-scope"

export const dynamic = "force-dynamic"

/**
 * GET /api/legacy-score/leaderboard
 * Query: sport?, leagueId?, entityType?, limit?, offset?
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const sport = url.searchParams.get("sport")
    const leagueId = url.searchParams.get("leagueId")
    const entityType = url.searchParams.get("entityType")
    const limitRaw = url.searchParams.get("limit")
    const offsetRaw = url.searchParams.get("offset")

    const limitParsed = limitRaw != null ? parseInt(limitRaw, 10) : NaN
    const offsetParsed = offsetRaw != null ? parseInt(offsetRaw, 10) : NaN
    const limit =
      Number.isFinite(limitParsed) && !Number.isNaN(limitParsed) ? Math.min(Math.max(limitParsed, 1), 200) : 80
    const offset =
      Number.isFinite(offsetParsed) && !Number.isNaN(offsetParsed) ? Math.max(offsetParsed, 0) : 0

    const { records, total } = await queryLegacyLeaderboard({
      ...(sport ? { sport: normalizeToSupportedSport(sport) } : {}),
      ...(leagueId ? { leagueId } : {}),
      ...(entityType ? { entityType } : {}),
      limit,
      offset,
    })
    return NextResponse.json({
      records,
      total,
      ...(leagueId ? { leagueId } : {}),
    })
  } catch (e) {
    console.error("[legacy-score/leaderboard GET]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: "Failed to load platform legacy leaderboard" },
      { status: 500 }
    )
  }
}
