/**
 * POST /api/tournament/[tournamentId]/draft/reopen — Reopen draft room for a league (e.g. after system issue).
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

  let body: { leagueId?: string } = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }
  const leagueId = body.leagueId
  if (!leagueId) return NextResponse.json({ error: 'leagueId required' }, { status: 400 })

  const tl = await prisma.legacyTournamentLeague.findFirst({
    where: { tournamentId, leagueId },
    select: { id: true },
  })
  if (!tl) return NextResponse.json({ error: 'League not in this tournament' }, { status: 404 })

  const draftSession = await prisma.draftSession.findUnique({
    where: { leagueId },
    select: { id: true, status: true },
  })
  if (!draftSession) return NextResponse.json({ error: 'No draft session for this league' }, { status: 404 })

  if (draftSession.status !== 'completed' && draftSession.status !== 'paused') {
    return NextResponse.json({
      ok: true,
      message: 'Draft already open or in progress',
      status: draftSession.status,
    })
  }

  await prisma.draftSession.update({
    where: { id: draftSession.id },
    data: { status: 'in_progress', updatedAt: new Date() },
  })

  await logTournamentAudit(tournamentId, 'draft_reopen', {
    actorId: userId,
    targetType: 'league',
    targetId: leagueId,
    metadata: { previousStatus: draftSession.status },
  })

  return NextResponse.json({ ok: true, leagueId, status: 'in_progress' })
}
