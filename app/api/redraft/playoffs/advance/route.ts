import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { advancePlayoffWinners } from '@/lib/redraft/playoffEngine'

export const dynamic = 'force-dynamic'

async function canManageLeague(leagueId: string, userId: string): Promise<boolean> {
  const league = await prisma.league.findFirst({
    where: { id: leagueId },
    select: {
      userId: true,
      teams: {
        where: { claimedByUserId: userId },
        select: { isCommissioner: true, isCoCommissioner: true },
      },
    },
  })
  if (!league) return false
  if (league.userId === userId) return true
  return (league.teams as { isCommissioner: boolean; isCoCommissioner: boolean }[]).some(
    (t) => t.isCommissioner || t.isCoCommissioner,
  )
}

/**
 * POST /api/redraft/playoffs/advance
 * Body: { seasonId: string; week: number }
 *
 * Advances winners from completed playoff matchups into the next round.
 * Commissioner-only. Idempotent — safe to call multiple times per week.
 */
export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { seasonId?: string; week?: number }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const seasonId = body.seasonId?.trim()
  if (!seasonId) return NextResponse.json({ error: 'seasonId required' }, { status: 400 })

  const week = Number(body.week)
  if (!Number.isFinite(week) || week < 1) {
    return NextResponse.json({ error: 'week must be a positive integer' }, { status: 400 })
  }

  const season = await prisma.redraftSeason.findFirst({
    where: { id: seasonId },
    select: { leagueId: true },
  })
  if (!season) return NextResponse.json({ error: 'Season not found' }, { status: 404 })

  const allowed = await canManageLeague(season.leagueId, userId)
  if (!allowed) return NextResponse.json({ error: 'Forbidden — commissioner only' }, { status: 403 })

  const result = await advancePlayoffWinners(seasonId, week)
  return NextResponse.json(result)
}
