import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getDashboardLeagueListForUser } from "@/lib/dashboard/get-dashboard-league-list"
import {
  getAllPlayers,
  getLeagueRosters,
  getLeagueTransactions,
  getLeagueUsers,
  getNflState,
  getPlayerName,
  type SleeperTransaction,
} from "@/lib/sleeper-client"
import type { ActivityFeedItem } from "@/lib/activity/placeholder"

export const dynamic = "force-dynamic"

// Bounds how many of the viewer's Sleeper leagues get a live transactions call per request —
// this endpoint is polled every 90s by useActivityFeed, so an unbounded per-league fetch
// fan-out isn't worth the real per-request cost for what's meant to be a lightweight feed.
const MAX_LEAGUES_TO_CHECK = 6
const WEEKS_TO_CHECK = 2

type LeagueListEntry = {
  id?: string
  name?: string
  platform?: string
  platformLeagueId?: string | null
  season?: number | string | null
  status?: string | null
}

function describeTransaction(
  tx: SleeperTransaction,
  rosterNames: Map<number, string>,
  players: Record<string, unknown>
): { type: ActivityFeedItem["type"]; description: string } {
  const playerName = (id: string) => getPlayerName(players as never, id)
  const teamsInvolved = tx.roster_ids.map((rid) => rosterNames.get(rid) ?? `Team ${rid}`)

  if (tx.type === "trade") {
    const summary = tx.roster_ids
      .map((rid) => {
        const gained = Object.entries(tx.adds ?? {})
          .filter(([, ownerRid]) => ownerRid === rid)
          .map(([pid]) => playerName(pid))
        return gained.length > 0 ? `${rosterNames.get(rid) ?? `Team ${rid}`} gets ${gained.join(", ")}` : null
      })
      .filter((s): s is string => Boolean(s))
      .join(" · ")
    return { type: "trade", description: summary || `Trade between ${teamsInvolved.join(" and ")}` }
  }

  const added = Object.keys(tx.adds ?? {}).map(playerName)
  const dropped = Object.keys(tx.drops ?? {}).map(playerName)
  const team = teamsInvolved[0] ?? "A team"
  const parts: string[] = []
  if (added.length > 0) parts.push(`added ${added.join(", ")}`)
  if (dropped.length > 0) parts.push(`dropped ${dropped.join(", ")}`)
  const verb = tx.type === "waiver" ? "Waiver claim" : "Free agent move"
  return { type: "waiver", description: `${verb}: ${team} ${parts.join(", ") || "made a roster move"}` }
}

/**
 * GET /api/shared/activity
 * Real League Buzz (audit #7): aggregates actual recent Sleeper transactions (trades,
 * waiver claims, free agent adds/drops) for the viewer's connected Sleeper leagues via
 * Sleeper's real /league/{id}/transactions/{week} endpoint — the same client function
 * (getLeagueTransactions) already used elsewhere in this codebase, just not previously
 * wired into this feed. Sleeper-imported leagues only ever stored point-in-time season
 * snapshots (LegacyLeague/LegacyRoster), not a transaction log, so there was nothing to
 * aggregate from the DB — this fetches live instead. Falls back to an honest empty
 * response if the viewer has no session, no Sleeper leagues, or every live call fails —
 * never fabricates activity.
 */
export async function GET(req: NextRequest) {
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") || "50"), 100)
  const leagueIdFilter = req.nextUrl.searchParams.get("leagueId") || undefined

  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ status: "ok", items: [] })
  }

  try {
    const { leagues } = await getDashboardLeagueListForUser(userId)
    let sleeperLeagues = (leagues as LeagueListEntry[]).filter(
      (l) => l.platform === "sleeper" && typeof l.platformLeagueId === "string" && l.platformLeagueId
    )
    if (leagueIdFilter) {
      sleeperLeagues = sleeperLeagues.filter((l) => l.id === leagueIdFilter || l.platformLeagueId === leagueIdFilter)
    }
    // Prefer leagues that are actually in season — most likely to have real recent activity.
    sleeperLeagues.sort((a, b) => (b.status === "in_season" ? 1 : 0) - (a.status === "in_season" ? 1 : 0))
    sleeperLeagues = sleeperLeagues.slice(0, MAX_LEAGUES_TO_CHECK)

    if (sleeperLeagues.length === 0) {
      return NextResponse.json({ status: "ok", items: [] })
    }

    const nflState = await getNflState()
    const currentWeek = Math.max(1, Number(nflState?.week) || 1)
    const weeksToFetch = Array.from({ length: WEEKS_TO_CHECK }, (_, i) => currentWeek - i).filter((w) => w >= 1)

    const players = await getAllPlayers()

    const items: ActivityFeedItem[] = []

    await Promise.all(
      sleeperLeagues.map(async (league) => {
        const leagueId = league.platformLeagueId as string
        const [users, rosters] = await Promise.all([getLeagueUsers(leagueId), getLeagueRosters(leagueId)])
        const userById = new Map(users.map((u) => [u.user_id, u.display_name || u.username]))
        const rosterNames = new Map<number, string>()
        for (const r of rosters) {
          if (r.owner_id) rosterNames.set(r.roster_id, userById.get(r.owner_id) ?? `Team ${r.roster_id}`)
        }

        const perWeek = await Promise.all(weeksToFetch.map((w) => getLeagueTransactions(leagueId, w)))
        const txs = perWeek.flat().filter((t) => t.status === "complete")

        for (const tx of txs) {
          const { type, description } = describeTransaction(tx, rosterNames, players)
          items.push({
            id: tx.transaction_id,
            type,
            userId: "",
            userName: rosterNames.get(tx.roster_ids[0]) ?? "League",
            avatarUrl: null,
            description,
            timestamp: new Date(tx.status_updated || tx.created).toISOString(),
            leagueId: league.id ?? leagueId,
            leagueName: league.name ?? null,
          })
        }
      })
    )

    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return NextResponse.json({ status: "ok", items: items.slice(0, limit) })
  } catch (err) {
    console.error("[api/shared/activity] live transaction fetch failed:", err)
    return NextResponse.json({ status: "ok", items: [] })
  }
}
