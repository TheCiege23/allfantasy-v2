import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * Recent AI Auto Start/Sit Protection swaps for the signed-in user (audit / history).
 */
export async function GET() {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const logs = await prisma.autoCoachSwapLog.findMany({
    where: { userId },
    orderBy: { swapMadeAt: 'desc' },
    take: 50,
    select: {
      id: true,
      leagueId: true,
      rosterId: true,
      slotPosition: true,
      playerOutId: true,
      playerOutName: true,
      playerOutStatus: true,
      playerInId: true,
      playerInName: true,
      playerInPosition: true,
      statusSource: true,
      statusDetectedAt: true,
      swapMadeAt: true,
      gameStartsAt: true,
      wasPreGame: true,
      confidence: true,
      expectedPointsDelta: true,
      decisionEngine: true,
      preferenceInfluenced: true,
      statusFreshnessAt: true,
      serverDecidedAt: true,
      decisionNotes: true,
    },
  })

  return NextResponse.json({
    swaps: logs.map((l) => ({
      ...l,
      statusDetectedAt: l.statusDetectedAt.toISOString(),
      swapMadeAt: l.swapMadeAt.toISOString(),
      gameStartsAt: l.gameStartsAt?.toISOString() ?? null,
      statusFreshnessAt: l.statusFreshnessAt?.toISOString() ?? null,
      serverDecidedAt: l.serverDecidedAt?.toISOString() ?? null,
    })),
  })
}
