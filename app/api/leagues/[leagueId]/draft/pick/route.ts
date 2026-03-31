/**
 * POST: Submit a pick. Validates duplicate, slot, then persists. Realtime: client should re-GET session after.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAccessLeagueDraft, canSubmitPickForRoster } from '@/lib/live-draft-engine/auth'
import { submitPick } from '@/lib/live-draft-engine/PickSubmissionService'
import { buildSessionSnapshot } from '@/lib/live-draft-engine/DraftSessionService'
import { appendPickToRosterDraftSnapshot } from '@/lib/live-draft-engine/RosterAssignmentService'
import {
  notifyDraftIntelOnClockUrgent,
  notifyDraftIntelPickConfirmation,
  notifyDraftIntelPlayerTaken,
  notifyDraftIntelQueueReady,
  notifyDraftIntelTierBreak,
  notifyOnTheClockAfterPick,
} from '@/lib/draft-notifications'
import { publishDraftIntelForUpcomingManagers, sendDraftIntelDm } from '@/lib/draft-intelligence'

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
  const playerName = body.playerName ?? body.player_name
  const position = body.position ?? ''
  const rosterId = body.rosterId ?? body.roster_id ?? null
  if (!playerName || !position) {
    return NextResponse.json({ error: 'playerName and position required' }, { status: 400 })
  }

  const preSubmitSnapshot = await buildSessionSnapshot(leagueId)
  if (!preSubmitSnapshot?.currentPick) {
    return NextResponse.json({ error: 'Draft is complete or not started' }, { status: 400 })
  }
  const expectedRosterId = preSubmitSnapshot.currentPick.rosterId
  const effectiveRosterId = rosterId ?? expectedRosterId
  if (effectiveRosterId !== expectedRosterId) {
    return NextResponse.json({ error: 'Invalid roster for current pick' }, { status: 400 })
  }
  const canSubmit = await canSubmitPickForRoster(leagueId, userId, effectiveRosterId)
  if (!canSubmit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const rawSource = String(body.source ?? 'user').toLowerCase()
  const source: 'user' | 'auto' | 'commissioner' | 'keeper' | 'devy' | 'college' | 'promoted_devy' =
    rawSource === 'auto' ||
    rawSource === 'commissioner' ||
    rawSource === 'keeper' ||
    rawSource === 'devy' ||
    rawSource === 'college' ||
    rawSource === 'promoted_devy'
      ? rawSource
      : 'user'

  const result = await submitPick({
    leagueId,
    playerName: String(playerName).trim(),
    position: String(position).trim(),
    team: body.team ?? null,
    byeWeek: body.byeWeek ?? body.bye_week ?? null,
    playerId: body.playerId ?? body.player_id ?? null,
    rosterId: effectiveRosterId,
    source,
    tradedPicks: body.tradedPicks ?? body.traded_picks ?? undefined,
  })

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  void notifyOnTheClockAfterPick(leagueId)
  void notifyDraftIntelPickConfirmation(leagueId, effectiveRosterId, String(playerName).trim()).catch(() => {})

  try {
    if (result.snapshot?.rosterId) {
      await appendPickToRosterDraftSnapshot(
        leagueId,
        result.snapshot.rosterId,
        {
          playerName: String(playerName).trim(),
          position: String(position).trim(),
          team: body.team ?? null,
          playerId: body.playerId ?? null,
          byeWeek: body.byeWeek ?? null,
        }
      ).catch(() => {})
    }
  } catch (_) {}

  const updated = await buildSessionSnapshot(leagueId)
  void (async () => {
    const states = await publishDraftIntelForUpcomingManagers({
      leagueId,
      trigger: 'pick_update',
    }).catch(() => [])
    for (const result of states) {
      const state = result.state
      await sendDraftIntelDm(state).catch(() => null)
      if (result.previousState?.queue.some((entry) => entry.playerName === String(playerName).trim())) {
        await notifyDraftIntelPlayerTaken(leagueId, state.rosterId, String(playerName).trim()).catch(() => null)
      }
      const previousTop = result.previousState?.queue.slice(0, 2).map((entry) => entry.playerName).join('|')
      const nextTop = state.queue.slice(0, 2).map((entry) => entry.playerName).join('|')
      if (previousTop && nextTop && previousTop !== nextTop) {
        await notifyDraftIntelTierBreak(
          leagueId,
          state.rosterId,
          state.queue.slice(0, 2).map((entry) => entry.playerName)
        ).catch(() => null)
      }
      if (state.status === 'active' && state.picksUntilUser === 5 && state.queue[0]) {
        await notifyDraftIntelQueueReady(leagueId, state.rosterId, {
          playerName: state.queue[0].playerName,
          availabilityProbability: state.queue[0].availabilityProbability,
        }).catch(() => null)
      }
      if (state.status === 'on_clock') {
        await notifyDraftIntelOnClockUrgent(leagueId, state.rosterId, {
          playerName: state.queue[0]?.playerName,
          pickLabel: updated?.currentPick?.pickLabel,
        }).catch(() => null)
      }
    }
  })()
  return NextResponse.json({
    ok: true,
    pick: result.snapshot,
    session: updated,
  })
}
