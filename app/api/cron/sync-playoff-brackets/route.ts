import { NextRequest, NextResponse } from "next/server"
import { requireCronAuth } from "@/app/api/cron/_auth"
import { SUPPORTED_SPORTS } from "@/lib/sport-scope"
import { syncPlayoffBracketFromApis } from "@/lib/brackets/espn-playoff-sync"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

/**
 * Vercel Cron: every 15 minutes (`vercel.json`). Refreshes playoff bracket seeds + `SportsGame` links.
 * Auth: `x-cron-secret` / `CRON_SECRET` (configure in Vercel cron job headers).
 */
export async function GET(req: NextRequest) {
  if (!requireCronAuth(req, "CRON_SECRET")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const season = new Date().getFullYear()
  const results: Array<
    | Awaited<ReturnType<typeof syncPlayoffBracketFromApis>>
    | { ok: false; sport: string; season: number; error: string }
  > = []

  for (const sport of SUPPORTED_SPORTS) {
    try {
      const r = await syncPlayoffBracketFromApis({ sport, season })
      results.push(r)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      results.push({ ok: false, sport, season, error: msg })
    }
  }

  return NextResponse.json({
    ok: results.every((r) => !("error" in r)),
    season,
    results,
  })
}
