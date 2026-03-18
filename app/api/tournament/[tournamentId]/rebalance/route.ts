/**
 * POST /api/tournament/[tournamentId]/rebalance — Commissioner rebalance before lock (audit only; fill stats returned).
 * Before lock, commissioner can redistribute invite links. This endpoint returns fill status and logs the action.
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logTournamentAudit } from '@/lib/tournament-mode/TournamentAuditService'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tournamentId } = await params
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, creatorId: true, lockedAt: true, status: true },
  })
  if (!tournament) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
  if (tournament.creatorId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (tournament.lockedAt) {
    return NextResponse.json(
      { error: 'Tournament is locked. Rebalance only allowed before competition starts.' },
      { status: 400 }
    )
  }

  const leagues = await prisma.tournamentLeague.findMany({
    where: { tournamentId, roundIndex: 0 },
    include: {
      league: {
        include: { _count: { select: { rosters: true } } },
      },
    },
  })

  const fillStatus = leagues.map((tl) => {
    const rosterCount = (tl.league as { _count?: { rosters: number } })._count?.rosters ?? 0
    const leagueSize = tl.league.leagueSize ?? 12
    return {
      leagueId: tl.leagueId,
      leagueName: tl.league.name,
      rosterCount,
      leagueSize,
      fillStatus: rosterCount >= leagueSize ? 'full' : rosterCount > 0 ? 'partial' : 'empty',
    }
  })

  await logTournamentAudit(tournamentId, 'rebalance', {
    actorId: userId,
    targetType: 'tournament',
    targetId: tournamentId,
    metadata: { fillStatus },
  })

  return NextResponse.json({
    ok: true,
    message: 'Rebalance check recorded. Use invite links to fill leagues before locking.',
    fillStatus,
  })
}
