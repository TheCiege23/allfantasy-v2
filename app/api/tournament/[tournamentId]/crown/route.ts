/**
 * [NEW] app/api/tournament/[tournamentId]/crown/route.ts
 * Crown the tournament champion. Commissioner-only. Locks the tournament permanently.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { crownChampion } from '@/lib/tournament-mode/TournamentChampionService'
import { emitTournamentNotification } from '@/lib/tournament-mode/TournamentNotificationEmitter'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ tournamentId: string }> }) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id ?? null
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tournamentId } = await params

  const tournament = await prisma.legacyTournament.findUnique({
    where: { id: tournamentId },
    select: { creatorId: true, status: true },
  })
  if (!tournament) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
  if (tournament.creatorId !== userId) {
    return NextResponse.json({ error: 'Only the commissioner can crown the champion' }, { status: 403 })
  }
  if (tournament.status === 'completed') {
    return NextResponse.json({ error: 'Tournament is already completed' }, { status: 400 })
  }

  try {
    const result = await crownChampion(tournamentId)

    await emitTournamentNotification({
      tournamentId,
      event: 'CHAMPION_CROWNED',
      meta: {
        championName: result.championTeamName,
        championUserId: result.championUserId,
      },
    })

    return NextResponse.json(result)
  } catch (e) {
    console.error('[tournament/crown] Error:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to crown champion' },
      { status: 500 }
    )
  }
}
