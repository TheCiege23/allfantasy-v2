import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { assertLeagueMember } from '@/lib/league/league-access'

export const dynamic = 'force-dynamic'

/**
 * Single payload for keeper UIs: league policy, seasons (for commissioner open-phase),
 * active selection session, and the viewer's RedraftRoster for the session season (if any).
 */
export async function GET(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const leagueId = req.nextUrl.searchParams?.get('leagueId')?.trim()
  if (!leagueId) return NextResponse.json({ error: 'leagueId required' }, { status: 400 })

  const gate = await assertLeagueMember(leagueId, userId)
  if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: gate.status })

  const league = await prisma.league.findFirst({
    where: { id: leagueId },
    select: {
      id: true,
      leagueSize: true,
      leagueType: true,
      keeperCount: true,
      keeperCostSystem: true,
      keeperSelectionDeadline: true,
      keeperPhaseActive: true,
      keeperEligibilityRule: true,
      keeperWaiverAllowed: true,
      keeperMaxYears: true,
      keeperRoundPenalty: true,
    },
  })
  if (!league) return NextResponse.json({ error: 'League not found' }, { status: 404 })

  const seasons = await prisma.redraftSeason.findMany({
    where: { leagueId },
    orderBy: [{ season: 'desc' }, { createdAt: 'desc' }],
    select: { id: true, season: true, status: true },
    take: 12,
  })

  const activeSession = await prisma.keeperSelectionSession.findFirst({
    where: { leagueId, status: { in: ['open', 'locked'] } },
    orderBy: { openedAt: 'desc' },
  })

  let viewerRoster: { id: string; seasonId: string } | null = null
  if (activeSession) {
    const rr = await prisma.redraftRoster.findFirst({
      where: { leagueId, ownerId: userId, seasonId: activeSession.seasonId },
      select: { id: true, seasonId: true },
    })
    if (rr) viewerRoster = { id: rr.id, seasonId: rr.seasonId }
  }

  const suggestedIncomingSeasonId = seasons[0]?.id ?? null

  return NextResponse.json({
    league,
    seasons,
    suggestedIncomingSeasonId,
    session: activeSession,
    viewerRoster,
  })
}
