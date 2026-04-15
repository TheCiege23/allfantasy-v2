/**
 * [UPDATED] POST: Regenerate draft rooms for a specific round.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { scheduleRedraftForRound } from '@/lib/tournament-mode/TournamentRedraftService'
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
  const roundIndex = typeof body.roundIndex === 'number' ? body.roundIndex : null
  if (roundIndex == null) return NextResponse.json({ error: 'roundIndex required' }, { status: 400 })

  try {
    const result = await scheduleRedraftForRound(tournamentId, roundIndex)
    await logTournamentAudit(tournamentId, 'redraft_regenerate', { actorId: userId, metadata: { roundIndex, ...result } })
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed' }, { status: 500 })
  }
}
