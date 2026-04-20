import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { computePlayoffSeeds } from '@/server/services/playoffEngine'
import { buildRosterLabelMap } from '@/lib/scoring-engine/resolveTeamLabels'
import { assertLeagueActionGate } from '@/server/services/leagueActionGate'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { leagueId: string } },
) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const leagueId = params.leagueId
  const league = await prisma.league.findFirst({
    where: { id: leagueId },
    select: { id: true, season: true, userId: true, teams: { select: { platformUserId: true } } },
  })
  if (!league) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const memberIds = new Set(
    league.teams.map((t) => t.platformUserId).filter((x): x is string => Boolean(x)),
  )
  if (league.userId !== session.user.id && !memberIds.has(session.user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const sp = req.nextUrl.searchParams
  const season = Math.max(2000, Math.min(2100, Number(sp.get('season')) || league.season))
  const refresh = sp.get('refresh') === '1'

  if (refresh) {
    const g = await assertLeagueActionGate(leagueId, session.user.id, 'standings_manual_edit')
    if (!g.ok) {
      return NextResponse.json({ error: g.err.error, code: g.err.code }, { status: g.err.status })
    }
    await computePlayoffSeeds(leagueId, season)
  }

  const [labels, rows] = await Promise.all([
    buildRosterLabelMap(leagueId),
    prisma.fantasyStanding.findMany({
      where: { leagueId, season, playoffSeed: { not: null } },
      orderBy: [{ playoffSeed: 'asc' }],
    }),
  ])

  const seeds = rows.map((r) => ({
    rosterId: r.rosterId,
    seed: r.playoffSeed,
    teamName: labels.get(r.rosterId) ?? r.rosterId,
    wins: r.wins,
    pointsFor: r.pointsFor,
  }))

  return NextResponse.json({ season, seeds })
}
