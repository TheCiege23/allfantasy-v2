import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: { leagueId: string } },
) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const leagueId = params.leagueId
  const league = await prisma.league.findFirst({
    where: { id: leagueId },
    select: { season: true, userId: true, teams: { select: { platformUserId: true } } },
  })
  if (!league) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const memberIds = new Set(
    league.teams.map((t) => t.platformUserId).filter((x): x is string => Boolean(x)),
  )
  if (league.userId !== session.user.id && !memberIds.has(session.user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const sp = req.nextUrl.searchParams
  const rosterId = sp.get('rosterId')
  if (!rosterId) return NextResponse.json({ error: 'rosterId required' }, { status: 400 })
  const season = Math.max(2000, Math.min(2100, Number(sp.get('season')) || league.season))
  const week = Math.max(1, Math.min(40, Number(sp.get('week')) || 1))

  const rows = await prisma.weeklyScore.findMany({
    where: { leagueId, season, week, rosterId },
    orderBy: [{ isStarter: 'desc' }, { points: 'desc' }],
  })

  return NextResponse.json({
    season,
    week,
    rosterId,
    players: rows.map((r) => ({
      playerId: r.playerId,
      points: r.points,
      isStarter: r.isStarter,
      statLine: r.statLine,
    })),
  })
}
