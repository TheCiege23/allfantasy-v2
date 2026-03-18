/**
 * POST /api/tournament/[tournamentId]/tie-resolution — Manual tie resolution with audit (commissioner).
 * Body: { winnerUserId: string, loserUserId?: string, reason: string }
 * Used when tiebreakers are exhausted and commissioner must pick who advances.
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
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, creatorId: true },
  })
  if (!tournament) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
  if (tournament.creatorId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: { winnerUserId?: string; loserUserId?: string; reason?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
  const winnerUserId = body.winnerUserId
  const reason = typeof body.reason === 'string' ? body.reason : 'Manual tie resolution'
  if (!winnerUserId) return NextResponse.json({ error: 'winnerUserId required' }, { status: 400 })

  const winner = await prisma.tournamentParticipant.findUnique({
    where: { tournamentId_userId: { tournamentId, userId: winnerUserId } },
  })
  if (!winner) return NextResponse.json({ error: 'Winner participant not found' }, { status: 404 })

  await logTournamentAudit(tournamentId, 'tie_resolution', {
    actorId: userId,
    targetType: 'participant',
    targetId: winnerUserId,
    metadata: { loserUserId: body.loserUserId ?? null, reason },
  })

  return NextResponse.json({
    ok: true,
    message: 'Tie resolution recorded. Advancement/elimination must be applied separately if not already done.',
    winnerUserId,
  })
}
