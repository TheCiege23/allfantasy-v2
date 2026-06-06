import { NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"
import { requireAdminOrBearer } from "@/lib/adminAuth"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function boundedNumber(raw: string | null, fallback: number, min: number, max: number): number {
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, Math.floor(parsed)))
}

export async function GET(req: Request) {
  const auth = await requireAdminOrBearer(req)
  if (!auth.ok) return auth.res

  const url = new URL(req.url)
  const hours = boundedNumber(url.searchParams.get("hours"), 24, 1, 24 * 30)
  const limit = boundedNumber(url.searchParams.get("limit"), 50, 1, 250)
  const eventName = url.searchParams.get("event")?.trim()
  const since = new Date(Date.now() - hours * 60 * 60 * 1000)

  const where: Prisma.AnalyticsEventWhereInput = {
    toolKey: { in: ["meta_capi", "meta_pixel"] },
    createdAt: { gte: since },
  }
  if (eventName) {
    where.event = eventName.startsWith("meta.") ? eventName : `meta.${eventName}`
  }

  const [recent, grouped] = await Promise.all([
    prisma.analyticsEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        event: true,
        toolKey: true,
        path: true,
        userId: true,
        createdAt: true,
        meta: true,
      },
    }),
    prisma.analyticsEvent.groupBy({
      by: ["event", "toolKey"],
      where,
      _count: { _all: true },
      _max: { createdAt: true },
    }),
  ])

  return NextResponse.json({
    ok: true,
    since: since.toISOString(),
    hours,
    counts: grouped.map((row) => ({
      event: row.event,
      toolKey: row.toolKey,
      count: row._count._all,
      lastSeenAt: row._max.createdAt?.toISOString() ?? null,
    })),
    recent: recent.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
    })),
  })
}
