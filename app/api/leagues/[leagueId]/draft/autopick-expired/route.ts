/**
 * POST: Submit pick from queue when timer has expired (slow draft / async).
 * Called when user is on the clock, timer is expired, and they have autopick from queue enabled.
 * Submits first available player from their queue.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAccessLeagueDraft, getCurrentUserRosterIdForLeague } from '@/lib/live-draft-engine/auth'
import { buildSessionSnapshot } from '@/lib/live-draft-engine/DraftSessionService'
import { submitPick } from '@/lib/live-draft-engine/PickSubmissionService'
import { appendPickToRosterDraftSnapshot } from '@/lib/live-draft-engine/RosterAssignmentService'
import { prisma } from '@/lib/prisma'

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

  const rosterId = await getCurrentUserRosterIdForLeague(leagueId, userId)
  if (!rosterId) return NextResponse.json({ error: 'No roster for this league' }, { status: 403 })

  const draftSession = await prisma.draftSession.findUnique({
    where: { leagueId },
    include: { picks: { orderBy: { overall: 'asc' } }, queues: true },
  })
  if (!draftSession || draftSession.status !== 'in_progress') {
    return NextResponse.json({ error: 'Draft not in progress' }, { status: 400 })
  }

  const { resolveCurrentOnTheClock } = await import('@/lib/live-draft-engine/CurrentOnTheClockResolver')
  const { resolvePickOwner } = await import('@/lib/live-draft-engine/PickOwnershipResolver')
  const slotOrder = (draftSession.slotOrder as { slot: number; rosterId: string; displayName: string }[]) ?? []
  const tradedPicks = Array.isArray(draftSession.tradedPicks) ? (draftSession.tradedPicks as { round: number; originalRosterId: string; previousOwnerName: string; newRosterId: string; newOwnerName: string }[]) : []
  const teamCount = draftSession.teamCount
  const totalPicks = draftSession.rounds * teamCount
  const picksCount = draftSession.picks.length
  const current = resolveCurrentOnTheClock({
    totalPicks,
    picksCount,
    teamCount,
    draftType: draftSession.draftType as 'snake' | 'linear' | 'auction',
    thirdRoundReversal: draftSession.thirdRoundReversal,
    slotOrder,
  })
  if (!current) return NextResponse.json({ error: 'No current pick' }, { status: 400 })
  const resolvedOwner = resolvePickOwner(current.round, current.slot, slotOrder, tradedPicks)
  const onClockRosterId = resolvedOwner?.rosterId ?? current.rosterId
  if (rosterId !== onClockRosterId) {
    return NextResponse.json({ error: 'You are not on the clock' }, { status: 400 })
  }

  const queueRow = draftSession.queues.find((q) => q.userId === userId)
  const order = (queueRow?.order as Array<{ playerName: string; position: string; team?: string | null; playerId?: string | null }>) ?? []
  const draftedNames = new Set(draftSession.picks.map((p) => p.playerName.trim().toLowerCase()))
  const availableInQueue = order.filter(
    (e) => e.playerName && !draftedNames.has(e.playerName.trim().toLowerCase())
  )

  const { getAllowedPositionsAndRosterSize } = await import('@/lib/live-draft-engine/RosterFitValidation')
  const rosterRules = await getAllowedPositionsAndRosterSize(leagueId)
  const allowedPositions = rosterRules?.allowedPositions
  const firstAvailable = allowedPositions
    ? availableInQueue.find((e) => e.position && allowedPositions.has((e.position || '').trim().toUpperCase()))
    : availableInQueue[0]

  if (!firstAvailable?.playerName || !firstAvailable?.position) {
    return NextResponse.json(
      {
        error: allowedPositions
          ? 'No available player in queue with an allowed position for this league. Add eligible players or make a manual pick.'
          : 'No available player in queue. Add players to your queue or make a manual pick.',
      },
      { status: 400 }
    )
  }

  const result = await submitPick({
    leagueId,
    playerName: firstAvailable.playerName.trim(),
    position: firstAvailable.position.trim(),
    team: firstAvailable.team ?? null,
    playerId: firstAvailable.playerId ?? null,
    rosterId,
    source: 'auto',
  })

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  const { notifyAutoPickFired, notifyOnTheClockAfterPick } = await import('@/lib/draft-notifications')
  void notifyAutoPickFired(leagueId, rosterId, firstAvailable.playerName.trim())
  void notifyOnTheClockAfterPick(leagueId)

  try {
    const snapshot = await buildSessionSnapshot(leagueId)
    if (snapshot?.currentPick && result.snapshot) {
      await appendPickToRosterDraftSnapshot(leagueId, rosterId, {
        playerName: firstAvailable.playerName.trim(),
        position: firstAvailable.position.trim(),
        team: firstAvailable.team ?? null,
        playerId: firstAvailable.playerId ?? null,
        byeWeek: null,
      }).catch(() => {})
    }
  } catch (_) {}

  const updated = await buildSessionSnapshot(leagueId)
  return NextResponse.json({
    ok: true,
    pick: result.snapshot,
    submittedPlayerName: firstAvailable.playerName.trim(),
    session: updated,
  })
}
