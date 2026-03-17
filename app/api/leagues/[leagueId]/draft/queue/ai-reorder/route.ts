/**
 * POST: AI reorder draft queue by roster need and availability.
 * Body: { queue?: QueueEntry[] } (default: load from DB).
 * Returns: { reordered: QueueEntry[], explanation: string }.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAccessLeagueDraft, getCurrentUserRosterIdForLeague } from '@/lib/live-draft-engine/auth'
import { prisma } from '@/lib/prisma'
import { reorderQueueByNeed } from '@/lib/draft-queue-engine/reorder-by-need'
import type { QueueEntry } from '@/lib/live-draft-engine/types'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId } = await ctx.params
  if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

  const allowed = await canAccessLeagueDraft(leagueId, userId)
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  let queue: QueueEntry[] = Array.isArray(body.queue) ? body.queue : []

  if (queue.length === 0) {
    const draftSession = await prisma.draftSession.findUnique({
      where: { leagueId },
      select: { id: true },
    })
    if (draftSession) {
      const row = await prisma.draftQueue.findUnique({
        where: { sessionId_userId: { sessionId: draftSession.id, userId } },
      })
      const order = (row?.order as unknown as QueueEntry[]) ?? []
      queue = order.filter(Boolean)
    }
  }

  if (queue.length < 2) {
    return NextResponse.json({
      reordered: queue,
      explanation: 'Queue has fewer than 2 players; no reorder needed.',
    })
  }

  const currentUserRosterId = await getCurrentUserRosterIdForLeague(leagueId, userId)
  const draftSession = await prisma.draftSession.findUnique({
    where: { leagueId },
    include: { picks: { orderBy: { overall: 'asc' } } },
  })
  const rosterPositions: string[] = []
  if (draftSession?.picks && (currentUserRosterId || userId)) {
    for (const p of draftSession.picks) {
      if (p.rosterId === currentUserRosterId) {
        rosterPositions.push(p.position ?? '')
      }
    }
  }

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { sport: true },
  })
  const sport = (league?.sport as string) ?? 'NFL'

  const result = reorderQueueByNeed({
    queue,
    rosterPositions,
    sport,
  })

  return NextResponse.json({
    reordered: result.reordered,
    explanation: result.explanation,
  })
}
