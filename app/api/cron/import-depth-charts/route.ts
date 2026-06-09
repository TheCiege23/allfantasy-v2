/**
 * GET/POST /api/cron/import-depth-charts
 *
 * Vercel Cron schedule: weekly on Wednesday at 04:00 UTC (see vercel.json).
 * Syncs NFL depth charts from Rolling Insights into the depthChart table.
 * Depth chart data provides role context (starter/backup) that improves
 * fantasy value scoring and draft advisor recommendations.
 *
 * Optional query params:
 *   season — 4-digit year string (defaults to current season)
 */

import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { requireCronAuth } from "@/app/api/cron/_auth"
import { syncNFLDepthChartsToDb } from "@/lib/rolling-insights"

export const dynamic = "force-dynamic"
export const maxDuration = 300

async function handle(req: NextRequest) {
  const url = new URL(req.url)
  const season = url.searchParams.get("season") ?? undefined

  const startedAt = Date.now()

  try {
    const count = await syncNFLDepthChartsToDb({ season })

    return NextResponse.json({
      ok: true,
      sport: "NFL",
      season: season ?? "current",
      synced: count,
      durationMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[cron/import-depth-charts] failed:", message)
    return NextResponse.json(
      { ok: false, sport: "NFL", error: message.slice(0, 240), durationMs: Date.now() - startedAt },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  if (!requireCronAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  return handle(req)
}

export async function POST(req: NextRequest) {
  if (!requireCronAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  return handle(req)
}
