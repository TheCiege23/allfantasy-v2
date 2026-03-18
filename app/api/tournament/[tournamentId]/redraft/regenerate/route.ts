/**
 * POST /api/tournament/[tournamentId]/redraft/regenerate — Regenerate/ensure redraft rooms for a round.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { scheduleRedraftForRound } from '@/lib/tournament-mode/TournamentRedraftService'
import { logTournamentAudit } from '@/lib/tournament-mode/TournamentAuditService'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tournamentId } = await params
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, creatorId: true },
  })
  if (!tournament) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
  if (tournament.creatorId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: { roundIndex?: number } = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }
  const roundIndex = Math.max(1, Number(body.roundIndex ?? 1))

  const { scheduled, leagueIds } = await scheduleRedraftForRound(tournamentId, roundIndex)

  await logTournamentAudit(tournamentId, 'redraft_regenerate', {
    actorId: userId,
    targetType: 'round',
    targetId: String(roundIndex),
    metadata: { scheduled, leagueIds },
  })

  return NextResponse.json({ ok: true, roundIndex, scheduled, leagueIds })
}
