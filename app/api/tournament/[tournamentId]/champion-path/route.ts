/**
 * GET /api/tournament/[tournamentId]/champion-path — Inspect champion path history (or any participant).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tournamentId } = await params
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, creatorId: true, championUserId: true, hubSettings: true },
  })
  if (!tournament) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })

  const hubSettings = (tournament.hubSettings as Record<string, unknown>) ?? {}
  const visibility = (hubSettings.visibility as string) ?? 'unlisted'
  const isCreator = tournament.creatorId === userId
  if (visibility === 'private' && !isCreator) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const participantUserId = req.nextUrl.searchParams.get('userId') ?? tournament.championUserId ?? null
  if (!participantUserId) {
    return NextResponse.json({
      championUserId: null,
      championPath: null,
      message: 'No champion set and no userId requested.',
    })
  }

  const participant = await prisma.tournamentParticipant.findUnique({
    where: { tournamentId_userId: { tournamentId, userId: participantUserId } },
    select: {
      userId: true,
      status: true,
      qualificationLeagueId: true,
      qualificationRankInConference: true,
      currentLeagueId: true,
      advancedAtRoundIndex: true,
      eliminatedAtRoundIndex: true,
      bubbleAdvanced: true,
      bracketLabel: true,
    },
  })
  if (!participant) {
    return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
  }

  const path = {
    userId: participant.userId,
    status: participant.status,
    qualificationLeagueId: participant.qualificationLeagueId,
    qualificationRankInConference: participant.qualificationRankInConference,
    currentLeagueId: participant.currentLeagueId,
    advancedAtRoundIndex: participant.advancedAtRoundIndex,
    eliminatedAtRoundIndex: participant.eliminatedAtRoundIndex,
    bubbleAdvanced: participant.bubbleAdvanced,
    bracketLabel: participant.bracketLabel,
    isChampion: tournament.championUserId === participantUserId,
  }

  return NextResponse.json({
    championUserId: tournament.championUserId,
    championPath: path,
  })
}
