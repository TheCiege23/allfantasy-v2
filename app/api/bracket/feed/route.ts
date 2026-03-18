import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { encodeCursor } from "@/lib/api-performance"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tournamentId = req.nextUrl.searchParams.get("tournamentId")
  const leagueId = req.nextUrl.searchParams.get("leagueId")
  const limit = Math.min(50, Math.max(1, Number(req.nextUrl.searchParams.get("limit") || 30)))
  const before = req.nextUrl.searchParams.get("before")
  const cursor = req.nextUrl.searchParams.get("cursor")

  if (!tournamentId) {
    return NextResponse.json({ error: "tournamentId required" }, { status: 400 })
  }

  const cursorDate = cursor ? (() => {
    try {
      const decoded = Buffer.from(cursor, "base64url").toString("utf8")
      const d = new Date(decoded)
      return Number.isNaN(d.getTime()) ? null : d
    } catch {
      return null
    }
  })() : null

  const where: any = {
    tournamentId,
    ...(before ? { createdAt: { lt: new Date(before) } } : cursorDate ? { createdAt: { lt: cursorDate } } : {}),
  }

  if (leagueId) {
    where.OR = [{ leagueId }, { leagueId: null }]
  } else {
    where.leagueId = null
  }

  const take = limit + 1
  const events = await (prisma as any).bracketFeedEvent.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take,
  })

  const hasMore = events.length > limit
  const items = hasMore ? events.slice(0, limit) : events
  const last = items[items.length - 1]
  const nextCursor = hasMore && last?.createdAt ? encodeCursor(last.createdAt) : null

  return NextResponse.json({
    events: items.map((e: any) => ({
      id: e.id,
      eventType: e.eventType,
      headline: e.headline,
      detail: e.detail,
      metadata: e.metadata,
      leagueId: e.leagueId,
      createdAt: e.createdAt.toISOString(),
    })),
    hasMore,
    nextCursor,
    limit,
  })
}
