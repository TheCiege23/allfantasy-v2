import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getRosterPlayerIds } from "@/lib/waiver-wire/roster-utils"
import { getPlayerPoolForLeague } from "@/lib/sport-teams/SportPlayerPoolResolver"

/**
 * GET: list players available to add (not on any roster in this league).
 * Query: sport (default from league), limit. Uses SportsPlayer for pool if present.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { leagueId: string } }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const leagueId = params.leagueId
  const [league, rosterAsMember] = await Promise.all([
    (prisma as any).league.findFirst({
      where: { id: leagueId },
      select: { id: true, sport: true, leagueVariant: true, userId: true },
    }),
    (prisma as any).roster.findFirst({ where: { leagueId, platformUserId: userId }, select: { id: true } }),
  ])
  if (!league) return NextResponse.json({ error: "League not found" }, { status: 404 })
  if (league.userId !== userId && !rosterAsMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const rosters = await (prisma as any).roster.findMany({
    where: { leagueId },
    select: { playerData: true },
  })
  const rosteredIds = new Set<string>()
  for (const r of rosters) {
    const ids = getRosterPlayerIds(r.playerData)
    ids.forEach((id) => rosteredIds.add(id))
  }

  const sport = req.nextUrl.searchParams.get("sport") ?? (league.sport ?? "NFL")
  const normalizedSport = String(sport || '').toUpperCase()
  const leagueSportUpper = String(league.sport ?? 'NFL').toUpperCase()
  if (normalizedSport !== leagueSportUpper) {
    return NextResponse.json(
      { error: 'Sport mismatch: waiver player pool must match league sport.' },
      { status: 400 }
    )
  }
  const limit = Math.min(200, Math.max(1, Number(req.nextUrl.searchParams.get("limit") || "100")))
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase()
  const position = req.nextUrl.searchParams.get("position") ?? undefined
  const teamId = req.nextUrl.searchParams.get("teamId") ?? undefined

  let players: { id: string; name: string; position: string | null; team: string | null }[] = []
  const pool = await getPlayerPoolForLeague(leagueId, league.sport ?? 'NFL', {
    limit: 500,
    position,
    teamId,
  })

  for (const p of pool) {
    const playerId = String(p.player_id ?? '')
    const externalId = String(p.external_source_id ?? '')
    if ((playerId && rosteredIds.has(playerId)) || (externalId && rosteredIds.has(externalId))) continue
    if (q && !p.full_name?.toLowerCase().includes(q)) continue
    players.push({
      id: playerId,
      name: p.full_name ?? "Unknown",
      position: p.position ?? null,
      team: p.team_abbreviation ?? null,
    })
  }
  players = players.slice(0, limit)
  return NextResponse.json({ players, rosteredCount: rosteredIds.size })
}
