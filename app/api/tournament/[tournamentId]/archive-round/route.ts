/**
 * POST /api/tournament/[tournamentId]/archive-round — Mark finished round leagues as archived (round status = archived).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logTournamentAudit } from '@/lib/tournament-mode/TournamentAuditService'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tournamentId } = await params
  const tournament = await prisma.legacyTournament.findUnique({
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
  const roundIndex = Math.max(0, Number(body.roundIndex ?? 0))

  const round = await prisma.legacyTournamentRound.findUnique({
    where: { tournamentId_roundIndex: { tournamentId, roundIndex } },
  })
  if (!round) return NextResponse.json({ error: 'Round not found' }, { status: 404 })
  if (round.status === 'archived') {
    return NextResponse.json({ ok: true, message: 'Round already archived', roundIndex })
  }

  await prisma.legacyTournamentRound.update({
    where: { tournamentId_roundIndex: { tournamentId, roundIndex } },
    data: { status: 'archived', updatedAt: new Date() },
  })

  await logTournamentAudit(tournamentId, 'archive_round', {
    actorId: userId,
    targetType: 'round',
    targetId: String(roundIndex),
    metadata: { roundIndex },
  })

  return NextResponse.json({ ok: true, roundIndex, status: 'archived' })
}
