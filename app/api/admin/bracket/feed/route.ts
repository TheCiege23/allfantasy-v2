import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withApiUsage } from "@/lib/telemetry/usage"
import { isAuthorizedRequest, adminUnauthorized } from "@/lib/adminAuth"

export const dynamic = "force-dynamic"

type QueryParams = {
  tournamentId?: string
  leagueId?: string
  eventType?: string
  limit?: number
  before?: string
}

export const GET = withApiUsage({
  endpoint: "/api/admin/bracket/feed",
  tool: "AdminBracketFeed",
})(async (request: NextRequest) => {
  try {
    if (!isAuthorizedRequest(request)) return adminUnauthorized()

    const url = new URL(request.url)
    const params: QueryParams = {
      tournamentId: url.searchParams.get("tournamentId") || undefined,
      leagueId: url.searchParams.get("leagueId") || undefined,
      eventType: url.searchParams.get("eventType") || undefined,
      before: url.searchParams.get("before") || undefined,
      limit: Number(url.searchParams.get("limit") || "50"),
    }

    const limit = Math.max(1, Math.min(params.limit || 50, 200))

    const where: any = {}
    if (params.tournamentId) where.tournamentId = params.tournamentId
    if (params.leagueId) where.leagueId = params.leagueId
    if (params.eventType) where.eventType = params.eventType
    if (params.before) where.createdAt = { lt: new Date(params.before) }

    const events = await (prisma as any).bracketFeedEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    })

    return NextResponse.json({
      ok: true,
      count: events.length,
      events: events.map((e: any) => ({
        id: e.id,
        tournamentId: e.tournamentId,
        leagueId: e.leagueId,
        eventType: e.eventType,
        headline: e.headline,
        detail: e.detail,
        metadata: e.metadata,
        createdAt: e.createdAt.toISOString(),
      })),
    })
  } catch (err: any) {
    console.error("[AdminBracketFeed] Error:", err)
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to load bracket feed events" },
      { status: 500 },
    )
  }
})

