import { NextRequest, NextResponse } from "next/server"
import { getRankedLeagues } from "@/lib/league-ranking"

export const dynamic = "force-dynamic"

/**
 * GET: League ranking by activity and quality.
 * Returns leagues with popularity score (0–100) and component metrics.
 * Query: sport, limit, recentDays (optional window for activity counts).
 */
export async function GET(req: NextRequest) {
  try {
    const sport = req.nextUrl.searchParams.get("sport") ?? null
    const limit = Math.min(100, Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") ?? "50", 10)))
    const recentDaysParam = req.nextUrl.searchParams.get("recentDays")
    const recentDays = recentDaysParam ? parseInt(recentDaysParam, 10) : undefined
    const validRecentDays =
      recentDays != null && !Number.isNaN(recentDays) && recentDays > 0 ? recentDays : undefined

    const ranked = await getRankedLeagues({
      sport: sport || undefined,
      limit,
      recentDays: validRecentDays,
    })

    return NextResponse.json(
      {
        ok: true,
        leagues: ranked.map((r) => ({
          leagueId: r.leagueId,
          leagueName: r.leagueName,
          sport: r.sport,
          popularityScore: r.popularityScore.score,
          components: r.popularityScore.components,
          metrics: {
            leagueActivityCount: r.metrics.leagueActivityCount,
            chatMessageCount: r.metrics.chatMessageCount,
            tradeFrequencyCount: r.metrics.tradeFrequencyCount,
            transactionCount: r.metrics.transactionCount,
            draftParticipation: r.metrics.draftParticipation,
            managerCount: r.metrics.managerCount,
            leagueSize: r.metrics.leagueSize,
            retainedManagerCount: r.metrics.retainedManagerCount,
            managerRetentionRate: r.metrics.managerRetentionRate,
            activeManagerCount: r.metrics.activeManagerCount,
            lastActivityAt: r.metrics.lastActivityAt?.toISOString() ?? null,
          },
        })),
      },
      { headers: { "Cache-Control": "private, max-age=120, stale-while-revalidate=60" } }
    )
  } catch (err: unknown) {
    console.error("[leagues/ranking]", err)
    return NextResponse.json({ error: "Failed to compute league ranking" }, { status: 500 })
  }
}
