import { NextRequest, NextResponse } from "next/server"
import { requireCronAuth } from "@/app/api/cron/_auth"
import { SUPPORTED_SPORTS } from "@/lib/sport-scope"
import { syncPlayoffBracketFromApis } from "@/lib/brackets/espn-playoff-sync"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * POST: Sync playoff bracket tournaments from ESPN standings + live scores (`SportsGame`).
 * Body: `{ sport?: string, season?: number, allSports?: boolean }`
 * Auth: `x-cron-secret` / `CRON_SECRET` when set (same as other workers).
 */
export async function POST(req: NextRequest) {
  const devOpen =
    process.env.NODE_ENV === "development" && !String(process.env.CRON_SECRET ?? "").trim()
  if (!devOpen && !requireCronAuth(req, "CRON_SECRET")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json().catch(() => ({} as Record<string, unknown>))
    const season =
      typeof body.season === "number" && Number.isFinite(body.season)
        ? Math.floor(body.season)
        : new Date().getFullYear()
    const allSports = body.allSports === true
    const sportRaw = typeof body.sport === "string" ? body.sport.trim() : ""

    let sports: string[]
    if (allSports) {
      sports = [...SUPPORTED_SPORTS]
    } else if (sportRaw) {
      const u = sportRaw.toUpperCase()
      if (!(SUPPORTED_SPORTS as readonly string[]).includes(u)) {
        return NextResponse.json({ error: `Unsupported sport: ${sportRaw}` }, { status: 400 })
      }
      sports = [u]
    } else {
      sports = [...SUPPORTED_SPORTS]
    }

    const results: Awaited<ReturnType<typeof syncPlayoffBracketFromApis>>[] = []
    for (const sport of sports) {
      const r = await syncPlayoffBracketFromApis({ sport, season })
      results.push(r)
    }

    return NextResponse.json({
      ok: results.every((r) => r.ok),
      season,
      results,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Sync failed"
    console.error("[sync-playoff]", err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
