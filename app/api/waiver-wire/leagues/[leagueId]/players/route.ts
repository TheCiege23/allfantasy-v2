import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getRosterPlayerIds } from "@/lib/waiver-wire/roster-utils"

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
      select: { id: true, sport: true, userId: true },
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
  const limit = Math.min(200, Math.max(1, Number(req.nextUrl.searchParams.get("limit") || "100")))
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase()

  let players: { id: string; name: string; position: string | null; team: string | null }[] = []
  const sportPlayers = await (prisma as any).sportsPlayer.findMany({
    where: {
      sport: sport.toUpperCase(),
      expiresAt: { gt: new Date() },
    },
    select: { id: true, name: true, position: true, team: true },
    take: 500,
  })
  for (const p of sportPlayers) {
    if (rosteredIds.has(p.id)) continue
    if (q && !p.name?.toLowerCase().includes(q)) continue
    players.push({
      id: p.id,
      name: p.name ?? "Unknown",
      position: p.position ?? null,
      team: p.team ?? null,
    })
  }
  players = players.slice(0, limit)
  return NextResponse.json({ players, rosteredCount: rosteredIds.size })
}
