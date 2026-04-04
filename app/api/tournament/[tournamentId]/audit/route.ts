/**
 * GET /api/tournament/[tournamentId]/audit — Commissioner reviews audit logs.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getTournamentAuditLogs } from '@/lib/tournament-mode/TournamentAuditService'
import type { TournamentAuditAction } from '@/lib/tournament-mode/TournamentAuditService'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tournamentId } = await params
  const tournament = await prisma.legacyTournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, creatorId: true, hubSettings: true },
  })
  if (!tournament) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })

  const hubSettings = (tournament.hubSettings as Record<string, unknown>) ?? {}
  const visibility = (hubSettings.visibility as string) ?? 'unlisted'
  const isCreator = tournament.creatorId === userId
  if (visibility === 'private' && !isCreator) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!isCreator) {
    return NextResponse.json({ error: 'Only commissioner can view audit logs' }, { status: 403 })
  }

  const limit = Math.min(200, Math.max(1, Number(req.nextUrl.searchParams.get('limit')) || 100))
  const action = req.nextUrl.searchParams.get('action') as TournamentAuditAction | null

  const logs = await getTournamentAuditLogs(tournamentId, { limit, action: action ?? undefined })
  return NextResponse.json({ logs })
}
