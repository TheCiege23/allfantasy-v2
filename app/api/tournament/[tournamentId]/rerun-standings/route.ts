/**
 * [UPDATED] POST: Rerun standings calculation and return fresh results.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUniversalStandings } from '@/lib/tournament-mode/TournamentStandingsService'
import { logTournamentAudit } from '@/lib/tournament-mode/TournamentAuditService'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ tournamentId: string }> }) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id ?? null
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tournamentId } = await params
  const tournament = await prisma.legacyTournament.findUnique({ where: { id: tournamentId }, select: { creatorId: true } })
  if (!tournament) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (tournament.creatorId !== userId) return NextResponse.json({ error: 'Commissioner only' }, { status: 403 })

  try {
    const standings = await getUniversalStandings(tournamentId)
    await logTournamentAudit(tournamentId, 'rerun_standings', { actorId: userId, metadata: { rowCount: standings.length } })
    return NextResponse.json({ ok: true, standings, rowCount: standings.length })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed' }, { status: 500 })
  }
}
