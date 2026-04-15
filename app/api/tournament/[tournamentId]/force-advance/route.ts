/**
 * [UPDATED] POST: Force-advance a participant (commissioner override with audit log).
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logTournamentAudit } from '@/lib/tournament-mode/TournamentAuditService'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest, { params }: { params: Promise<{ tournamentId: string }> }) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id ?? null
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tournamentId } = await params
  const tournament = await prisma.legacyTournament.findUnique({ where: { id: tournamentId }, select: { creatorId: true } })
  if (!tournament) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (tournament.creatorId !== userId) return NextResponse.json({ error: 'Commissioner only' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const targetUserId = body.userId as string
  const reason = (body.reason as string) ?? 'Commissioner override'
  if (!targetUserId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  const participant = await prisma.legacyTournamentParticipant.findUnique({
    where: { tournamentId_userId: { tournamentId, userId: targetUserId } },
  })
  if (!participant) return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
  if (participant.status !== 'eliminated') return NextResponse.json({ error: 'Participant is not eliminated — already active' }, { status: 400 })

  await prisma.legacyTournamentParticipant.update({
    where: { tournamentId_userId: { tournamentId, userId: targetUserId } },
    data: { status: 'active', eliminatedAtRoundIndex: null },
  })

  await logTournamentAudit(tournamentId, 'force_advance', {
    actorId: userId,
    targetType: 'participant',
    targetId: targetUserId,
    metadata: { reason },
  })

  return NextResponse.json({ ok: true, userId: targetUserId, status: 'active' })
}
