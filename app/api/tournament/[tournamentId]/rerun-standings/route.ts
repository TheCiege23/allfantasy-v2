/**
 * POST /api/tournament/[tournamentId]/rerun-standings — Rerun standings calculation (no-op; standings are computed on demand).
 * Logs audit for commissioner record. Optional: could trigger cache refresh if we add caching later.
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUniversalStandings } from '@/lib/tournament-mode/TournamentStandingsService'
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
    select: { id: true, creatorId: true },
  })
  if (!tournament) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
  if (tournament.creatorId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const rows = await getUniversalStandings(tournamentId)

  await logTournamentAudit(tournamentId, 'rerun_standings', {
    actorId: userId,
    targetType: 'tournament',
    targetId: tournamentId,
    metadata: { rowCount: rows.length },
  })

  return NextResponse.json({ ok: true, standingsCount: rows.length })
}
