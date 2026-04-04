/**
 * POST /api/tournament/[tournamentId]/lock — Commissioner locks tournament (start competition, no rebalance).
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
  const tournament = await prisma.legacyTournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, creatorId: true, status: true, lockedAt: true },
  })
  if (!tournament) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
  if (tournament.creatorId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (tournament.lockedAt) {
    return NextResponse.json({ ok: true, message: 'Already locked', lockedAt: tournament.lockedAt })
  }

  const now = new Date()
  await prisma.legacyTournament.update({
    where: { id: tournamentId },
    data: {
      lockedAt: now,
      status: tournament.status === 'setup' ? 'qualification' : tournament.status,
      updatedAt: now,
    },
  })

  await logTournamentAudit(tournamentId, 'lock', {
    actorId: userId,
    targetType: 'tournament',
    targetId: tournamentId,
    metadata: { previousStatus: tournament.status },
  })

  return NextResponse.json({ ok: true, lockedAt: now.toISOString() })
}
