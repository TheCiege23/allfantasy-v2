import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { processLeagueWeek } from '@/server/services/weeklyProcessor'
import { logAction } from '@/server/services/auditService'
import { assertLeagueActionGate } from '@/server/services/leagueActionGate'

export async function POST(
  req: NextRequest,
  { params }: { params: { leagueId: string } },
) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const gate = await assertLeagueActionGate(params.leagueId, userId, 'scoring_process_week')
  if (!gate.ok) {
    return NextResponse.json({ error: gate.err.error, code: gate.err.code }, { status: gate.err.status })
  }

  const body = await req.json().catch(() => ({}))
  const league = await prisma.league.findUnique({
    where: { id: params.leagueId },
    select: { season: true },
  })
  if (!league) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const season = Math.max(2000, Math.min(2100, Number(body.season) || league.season))
  const week = Math.max(1, Math.min(40, Number(body.week) || 1))

  const result = await processLeagueWeek({ leagueId: params.leagueId, season, week })

  void logAction({
    leagueId: params.leagueId,
    userId,
    actionType: 'scoring_process_week',
    entityType: 'scoring',
    entityId: `${season}-w${week}`,
    metadata: { season, week },
  }).catch(() => {})

  void import('@/lib/league-events/publisher').then(({ publishLeagueFanoutEvent }) =>
    publishLeagueFanoutEvent({
      leagueId: params.leagueId,
      eventType: 'score_finalized',
      title: `Week ${week} scoring updated`,
      message: 'Scores and matchups have been processed for this week.',
      category: 'league_announcements',
      visibility: 'all_members',
      actorUserId: userId,
      meta: { season, week },
      dedupeKey: `score_finalized:${params.leagueId}:${season}-w${week}`,
    }).catch(() => {}),
  )

  return NextResponse.json({ ok: true, result })
}
