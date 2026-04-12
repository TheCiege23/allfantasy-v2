/**
 * [UPDATED] POST: Reopen a closed draft room (commissioner recovery tool).
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
  const leagueId = body.leagueId as string
  if (!leagueId) return NextResponse.json({ error: 'leagueId required' }, { status: 400 })

  // Verify league belongs to tournament
  const tl = await prisma.legacyTournamentLeague.findFirst({ where: { tournamentId, leagueId } })
  if (!tl) return NextResponse.json({ error: 'League not in this tournament' }, { status: 400 })

  // Find and reopen draft session
  const draftSession = await prisma.draftSession.findFirst({ where: { leagueId }, orderBy: { createdAt: 'desc' } })
  if (!draftSession) return NextResponse.json({ error: 'No draft session found for this league' }, { status: 404 })

  await prisma.draftSession.update({ where: { id: draftSession.id }, data: { status: 'pre_draft' } })
  await logTournamentAudit(tournamentId, 'draft_reopen', { actorId: userId, metadata: { leagueId, draftSessionId: draftSession.id } })

  return NextResponse.json({ ok: true, draftSessionId: draftSession.id, leagueId })
}
