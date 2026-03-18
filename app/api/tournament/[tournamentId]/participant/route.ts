/**
 * GET /api/tournament/[tournamentId]/participant — current user's participant record (status, eliminatedAtRoundIndex, etc.).
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { tournamentId } = await params
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, creatorId: true, hubSettings: true },
  })
  if (!tournament) {
    return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
  }

  const hubSettings = (tournament.hubSettings as Record<string, unknown>) ?? {}
  const visibility = (hubSettings.visibility as string) ?? 'unlisted'
  const isCreator = tournament.creatorId === userId
  if (visibility === 'private' && !isCreator) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const participant = await prisma.tournamentParticipant.findUnique({
    where: { tournamentId_userId: { tournamentId, userId } },
    select: {
      status: true,
      eliminatedAtRoundIndex: true,
      currentLeagueId: true,
      bracketLabel: true,
      advancedAtRoundIndex: true,
      qualificationRankInConference: true,
    },
  })

  if (!participant) {
    return NextResponse.json({ participant: null })
  }

  return NextResponse.json({ participant })
}
