/**
 * GET: Current user's draft queue for the league's session.
 * PUT: Save draft queue (order array).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canAccessLeagueDraft } from '@/lib/live-draft-engine/auth'
import type { QueueEntry } from '@/lib/live-draft-engine/types'
import { normalizeDraftQueueSizeLimit } from '@/lib/draft-defaults/DraftQueueLimitResolver'
import {
  dedupeQueueEntries,
  normalizeDraftedNameSet,
  normalizeQueueEntries,
  removeDraftedPlayersFromQueue,
} from '@/lib/draft-queue-engine'

export const dynamic = 'force-dynamic'

export async function GET(
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

  const draftSession = await prisma.draftSession.findUnique({
    where: { leagueId },
    select: {
      id: true,
      picks: {
        select: { playerName: true },
      },
    },
  })
  if (!draftSession) {
    return NextResponse.json({ leagueId, queue: [] })
  }

  const row = await prisma.draftQueue.findUnique({
    where: { sessionId_userId: { sessionId: draftSession.id, userId } },
  })
  const rawOrder = (row?.order as unknown as QueueEntry[]) ?? []
  const draftedNames = normalizeDraftedNameSet(draftSession.picks)
  const cleaned = removeDraftedPlayersFromQueue(dedupeQueueEntries(rawOrder), draftedNames)
  if (row && cleaned.removedCount > 0) {
    await prisma.draftQueue.update({
      where: { sessionId_userId: { sessionId: draftSession.id, userId } },
      data: { order: cleaned.queue as any, updatedAt: new Date() },
    })
  }
  return NextResponse.json({
    leagueId,
    queue: cleaned.queue,
    removedUnavailable: cleaned.removedCount,
  })
}

export async function PUT(
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
  const queue = Array.isArray(body.queue) ? body.queue : body.order
  if (!Array.isArray(queue)) {
    return NextResponse.json({ error: 'queue (array) required' }, { status: 400 })
  }

  const draftSession = await prisma.draftSession.findUnique({
    where: { leagueId },
    select: {
      id: true,
      picks: {
        select: { playerName: true },
      },
    },
  })
  if (!draftSession) {
    return NextResponse.json({ error: 'No draft session' }, { status: 404 })
  }

  const { getDraftConfigForLeague } = await import('@/lib/draft-defaults/DraftRoomConfigResolver')
  const draftConfig = await getDraftConfigForLeague(leagueId)
  const queueSizeLimit = normalizeDraftQueueSizeLimit(draftConfig?.queue_size_limit)

  const normalized = dedupeQueueEntries(
    normalizeQueueEntries(queue, queueSizeLimit)
  )

  const { getAllowedPositionsAndRosterSize } = await import('@/lib/live-draft-engine/RosterFitValidation')
  const rosterRules = await getAllowedPositionsAndRosterSize(leagueId)
  if (rosterRules?.allowedPositions) {
    const invalid = normalized.filter((e: { position: string }) => {
      const pos = (e.position ?? '').trim().toUpperCase()
      return pos && !rosterRules!.allowedPositions.has(pos)
    })
    if (invalid.length > 0) {
      const positions = [...new Set(invalid.map((e: { position: string }) => (e.position || '').trim() || '?'))]
      return NextResponse.json(
        {
          error: `Queue contains players with positions not allowed in this league: ${positions.join(', ')}. Allowed positions: ${[...rosterRules.allowedPositions].sort().join(', ')}.`,
        },
        { status: 400 }
      )
    }
  }

  const draftedNames = normalizeDraftedNameSet(draftSession.picks)
  const cleaned = removeDraftedPlayersFromQueue(normalized, draftedNames)

  await prisma.draftQueue.upsert({
    where: { sessionId_userId: { sessionId: draftSession.id, userId } },
    create: { sessionId: draftSession.id, userId, order: cleaned.queue as any },
    update: { order: cleaned.queue as any, updatedAt: new Date() },
  })

  return NextResponse.json({
    ok: true,
    leagueId,
    queue: cleaned.queue,
    removedUnavailable: cleaned.removedCount,
  })
}
