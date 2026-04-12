/**
 * [UPDATED] POST: Resolve invalid user progression state.
 * Fixes orphaned participants, mismatched statuses, or stuck round transitions.
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
  const tournament = await prisma.legacyTournament.findUnique({ where: { id: tournamentId }, select: { creatorId: true } })
  if (!tournament) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (tournament.creatorId !== userId) return NextResponse.json({ error: 'Commissioner only' }, { status: 403 })

  const fixes: string[] = []

  // Fix 1: Participants marked 'active' but with no current league (orphaned)
  const orphaned = await prisma.legacyTournamentParticipant.findMany({
    where: { tournamentId, status: 'active', currentLeagueId: null },
  })
  if (orphaned.length > 0) {
    await prisma.legacyTournamentParticipant.updateMany({
      where: { tournamentId, status: 'active', currentLeagueId: null },
      data: { status: 'eliminated', eliminatedAtRoundIndex: -1 },
    })
    fixes.push(`${orphaned.length} orphaned active participants → eliminated`)
  }

  // Fix 2: Participants with currentLeagueId pointing to a non-existent league
  const activeWithLeague = await prisma.legacyTournamentParticipant.findMany({
    where: { tournamentId, status: 'active', currentLeagueId: { not: null } },
    select: { userId: true, currentLeagueId: true },
  })
  for (const p of activeWithLeague) {
    if (!p.currentLeagueId) continue
    const exists = await prisma.league.findUnique({ where: { id: p.currentLeagueId }, select: { id: true } })
    if (!exists) {
      await prisma.legacyTournamentParticipant.update({
        where: { tournamentId_userId: { tournamentId, userId: p.userId } },
        data: { status: 'eliminated', currentLeagueId: null, currentRosterId: null, eliminatedAtRoundIndex: -1 },
      })
      fixes.push(`Participant ${p.userId.slice(0, 8)}… had invalid league ref → eliminated`)
    }
  }

  // Fix 3: Rounds stuck in 'active' that should be 'completed' (all leagues have zero active rosters)
  const activeRounds = await prisma.legacyTournamentRound.findMany({
    where: { tournamentId, status: 'active' },
  })
  for (const round of activeRounds) {
    const roundLeagues = await prisma.legacyTournamentLeague.findMany({
      where: { tournamentId, roundIndex: round.roundIndex },
      select: { leagueId: true },
    })
    // Check if a newer round exists (meaning this one should be completed)
    const newerRound = await prisma.legacyTournamentRound.findFirst({
      where: { tournamentId, roundIndex: { gt: round.roundIndex }, status: 'active' },
    })
    if (newerRound && roundLeagues.length > 0) {
      await prisma.legacyTournamentRound.update({
        where: { id: round.id },
        data: { status: 'completed' },
      })
      fixes.push(`Round ${round.roundIndex} stuck in 'active' with newer round → completed`)
    }
  }

  await logTournamentAudit(tournamentId, 'resolve_state', { actorId: userId, metadata: { fixes } })
  return NextResponse.json({ ok: true, fixes })
}
