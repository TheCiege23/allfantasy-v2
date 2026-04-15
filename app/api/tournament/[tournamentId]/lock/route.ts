/**
 * [UPDATED] POST: Lock tournament — prevents rebalance, invite changes after competition starts.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logTournamentAudit } from '@/lib/tournament-mode/TournamentAuditService'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ tournamentId: string }> }) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id ?? null
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tournamentId } = await params
  const tournament = await prisma.legacyTournament.findUnique({ where: { id: tournamentId }, select: { creatorId: true, status: true, settings: true } })
  if (!tournament) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (tournament.creatorId !== userId) return NextResponse.json({ error: 'Commissioner only' }, { status: 403 })

  const currentSettings = (tournament.settings as Record<string, unknown>) ?? {}
  if (currentSettings.locked) return NextResponse.json({ error: 'Tournament already locked' }, { status: 400 })

  await prisma.legacyTournament.update({
    where: { id: tournamentId },
    data: { settings: { ...currentSettings, locked: true, lockedAt: new Date().toISOString(), lockedBy: userId } },
  })
  await logTournamentAudit(tournamentId, 'lock', { actorId: userId })

  return NextResponse.json({ ok: true, locked: true })
}
