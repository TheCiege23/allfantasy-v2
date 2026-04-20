import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  resolveFullLineupLockContext,
  loadLeagueWeekContext,
} from '@/lib/roster-lineup-engine/lineupLockService'

function weekFromLeagueSettings(settings: unknown): number {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return 1
  const o = settings as Record<string, unknown>
  const w = o.currentWeek ?? o.current_week ?? o.week
  if (typeof w === 'number' && Number.isFinite(w)) return Math.max(1, w)
  if (typeof w === 'string') {
    const n = parseInt(w, 10)
    return Number.isFinite(n) ? Math.max(1, n) : 1
  }
  return 1
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ leagueId: string }> },
) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { leagueId } = await ctx.params
  const { searchParams } = new URL(req.url)
  const rosterIdParam = searchParams.get('rosterId')

  const league = await prisma.league.findUnique({ where: { id: leagueId } })
  if (!league) {
    return NextResponse.json({ error: 'League not found' }, { status: 404 })
  }

  let roster = rosterIdParam
    ? await prisma.roster.findFirst({ where: { id: rosterIdParam, leagueId } })
    : await prisma.roster.findFirst({ where: { leagueId, platformUserId: session.user.id } })

  if (!roster) {
    return NextResponse.json({ error: 'Roster not found' }, { status: 404 })
  }

  if (roster.platformUserId !== session.user.id && league.userId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { season } = await loadLeagueWeekContext(leagueId, league.settings, league.season)
  const leagueWeek = weekFromLeagueSettings(league.settings)
  const weekRaw = searchParams.get('week')
  const editingWeek =
    weekRaw && !Number.isNaN(parseInt(weekRaw, 10)) ? Math.max(1, parseInt(weekRaw, 10)) : leagueWeek

  const lockCtx = await resolveFullLineupLockContext({
    leagueId,
    rosterId: roster.id,
    sport: String(league.sport ?? 'NFL'),
    leagueVariant: league.leagueVariant,
    settings: league.settings,
    leagueWeek,
    editingWeek,
    season,
    playerData: roster.playerData,
    lockAllMoves: league.lockAllMoves,
    lifecycleState: league.lifecycleState,
  })

  return NextResponse.json({
    season,
    leagueWeek,
    editingWeek,
    lock: lockCtx,
  })
}
