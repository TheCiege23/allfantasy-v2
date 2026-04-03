import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { assertLeagueMember } from '@/lib/league/league-access'
import { requireCommissionerRole } from '@/lib/league/permissions'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const seasonId = req.nextUrl.searchParams.get('seasonId')?.trim()
  if (!seasonId) return NextResponse.json({ error: 'seasonId required' }, { status: 400 })

  const g = await prisma.guillotineSeason.findFirst({
    where: { id: seasonId },
    include: {
      eliminations: { orderBy: { scoringPeriod: 'desc' } },
      survivalLog: { take: 50, orderBy: { scoringPeriod: 'desc' } },
    },
  })
  if (!g) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const gate = await assertLeagueMember(g.leagueId, userId)
  if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: gate.status })

  return NextResponse.json({ season: g })
}

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { leagueId?: string; redraftSeasonId?: string; sport?: string; season?: number }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const leagueId = body.leagueId?.trim()
  const redraftSeasonId = body.redraftSeasonId?.trim()
  if (!leagueId || !redraftSeasonId) {
    return NextResponse.json({ error: 'leagueId and redraftSeasonId required' }, { status: 400 })
  }

  try {
    await requireCommissionerRole(leagueId, userId)
  } catch (err) {
    if (err instanceof Response) return err
    throw err
  }

  const rs = await prisma.redraftSeason.findFirst({ where: { id: redraftSeasonId, leagueId } })
  if (!rs) return NextResponse.json({ error: 'RedraftSeason not found' }, { status: 404 })

  const existing = await prisma.guillotineSeason.findFirst({ where: { redraftSeasonId: rs.id } })
  if (existing) return NextResponse.json({ season: existing })

  const rosters = await prisma.redraftRoster.count({ where: { seasonId: rs.id } })
  const g = await prisma.guillotineSeason.create({
    data: {
      leagueId,
      redraftSeasonId: rs.id,
      sport: body.sport ?? rs.sport,
      season: body.season ?? rs.season,
      status: 'setup',
      totalTeamsStarted: rosters,
      currentTeamsActive: rosters,
      currentScoringPeriod: 0,
    },
  })

  return NextResponse.json({ season: g })
}
