/**
 * [UPDATED] POST: Manual tie resolution with audit log.
 * Commissioner can override tiebreaker order for a specific pair of participants.
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
  const winnerUserId = body.winnerUserId as string
  const loserUserId = body.loserUserId as string
  const reason = (body.reason as string) ?? 'Commissioner tie resolution'
  if (!winnerUserId || !loserUserId) return NextResponse.json({ error: 'winnerUserId and loserUserId required' }, { status: 400 })

  // Verify both are participants
  const [winner, loser] = await Promise.all([
    prisma.legacyTournamentParticipant.findUnique({ where: { tournamentId_userId: { tournamentId, userId: winnerUserId } } }),
    prisma.legacyTournamentParticipant.findUnique({ where: { tournamentId_userId: { tournamentId, userId: loserUserId } } }),
  ])
  if (!winner || !loser) return NextResponse.json({ error: 'One or both participants not found' }, { status: 404 })

  // Record the resolution (swap advancement status if needed)
  await logTournamentAudit(tournamentId, 'tie_resolution', {
    actorId: userId,
    metadata: { winnerUserId, loserUserId, reason, winnerPrevStatus: winner.status, loserPrevStatus: loser.status },
  })

  // If loser was advanced and winner wasn't, swap them
  if (loser.status === 'active' && winner.status === 'eliminated') {
    await prisma.legacyTournamentParticipant.update({
      where: { tournamentId_userId: { tournamentId, userId: winnerUserId } },
      data: { status: 'active', eliminatedAtRoundIndex: null },
    })
    await prisma.legacyTournamentParticipant.update({
      where: { tournamentId_userId: { tournamentId, userId: loserUserId } },
      data: { status: 'eliminated', eliminatedAtRoundIndex: winner.eliminatedAtRoundIndex },
    })
  }

  return NextResponse.json({ ok: true, winnerUserId, loserUserId, reason })
}
