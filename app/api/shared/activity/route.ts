import { NextRequest, NextResponse } from "next/server"
import { getPlaceholderActivity } from "@/lib/activity/placeholder"

/**
 * GET /api/shared/activity
 * Returns league activity (trades, waivers, lineups, messages, announcements).
 * Optional query: limit (default 50), leagueId (filter by league).
 * Placeholder implementation: returns placeholder data until real activity source is wired.
 */
export async function GET(req: NextRequest) {
  const limit = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get("limit") || "50")))
  const leagueId = req.nextUrl.searchParams.get("leagueId") || undefined

  // TODO: resolve user and fetch real activity from DB/events
  const items = getPlaceholderActivity()
  const filtered = leagueId ? items.filter((i) => i.leagueId === leagueId) : items
  const sliced = filtered.slice(0, limit)

  return NextResponse.json({ status: "ok", items: sliced })
}
