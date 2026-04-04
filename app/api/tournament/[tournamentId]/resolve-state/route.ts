/**
 * POST /api/tournament/[tournamentId]/resolve-state — Commissioner fixes invalid participant progression state.
 * Body: { userId: string, currentLeagueId?: string, currentRosterId?: string, status?: 'active'|'eliminated', eliminatedAtRoundIndex?: number }
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

  let body: {
    userId?: string
    currentLeagueId?: string
    currentRosterId?: string
    status?: 'active' | 'eliminated'
    eliminatedAtRoundIndex?: number
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
  const targetUserId = body.userId
  if (!targetUserId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  const participant = await prisma.legacyTournamentParticipant.findUnique({
    where: { tournamentId_userId: { tournamentId, userId: targetUserId } },
  })
  if (!participant) return NextResponse.json({ error: 'Participant not found' }, { status: 404 })

  const before = {
    currentLeagueId: participant.currentLeagueId,
    currentRosterId: participant.currentRosterId,
    status: participant.status,
    eliminatedAtRoundIndex: participant.eliminatedAtRoundIndex,
  }

  const updateData: Record<string, unknown> = {}
  if (body.currentLeagueId !== undefined) updateData.currentLeagueId = body.currentLeagueId
  if (body.currentRosterId !== undefined) updateData.currentRosterId = body.currentRosterId
  if (body.status !== undefined) updateData.status = body.status
  if (body.eliminatedAtRoundIndex !== undefined) updateData.eliminatedAtRoundIndex = body.eliminatedAtRoundIndex

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No updates provided' }, { status: 400 })
  }

  await prisma.legacyTournamentParticipant.update({
    where: { tournamentId_userId: { tournamentId, userId: targetUserId } },
    data: updateData as any,
  })

  await logTournamentAudit(tournamentId, 'resolve_state', {
    actorId: userId,
    targetType: 'participant',
    targetId: targetUserId,
    metadata: { before, after: { ...before, ...updateData } },
  })

  return NextResponse.json({
    ok: true,
    userId: targetUserId,
    before,
    after: { ...before, ...updateData },
  })
}
