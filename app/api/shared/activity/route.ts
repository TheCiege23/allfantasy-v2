import { NextRequest, NextResponse } from "next/server"

/**
 * GET /api/shared/activity
 * Returns league activity (trades, waivers, lineups, messages, announcements).
 * Optional query: limit (default 50), leagueId (filter by league).
 *
 * No real cross-source activity aggregator (trades + waivers + chat + announcements)
 * exists yet, and Legacy/Sleeper-imported leagues only carry point-in-time season
 * snapshots (LegacyLeague/LegacyRoster), not a time-ordered event log — so there is no
 * real "recent activity" to derive from them. This used to unconditionally return
 * fabricated sample trades/waivers/messages; it now honestly returns no items, and the
 * feed (LeagueActivityFeed / ActivityFeed) renders its real empty state instead.
 * TODO: wire real events (AfLeagueTrade, waiver claims, league chat) once a cross-source
 * aggregator exists.
 */
export async function GET(_req: NextRequest) {
  return NextResponse.json({ status: "ok", items: [] })
}

