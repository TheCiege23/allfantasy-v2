/**
 * POST: Commissioner controls — pause, resume, reset_timer, undo_pick, force_autopick, complete.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { assertCommissioner } from '@/lib/commissioner/permissions'
import {
  pauseDraftSession,
  resumeDraftSession,
  resetTimer,
  undoLastPick,
  completeDraftSession,
  resetDraftSession,
  buildSessionSnapshot,
  setTimerSeconds,
} from '@/lib/live-draft-engine/DraftSessionService'
import { resolveAuctionWin } from '@/lib/live-draft-engine/auction/AuctionEngine'
import { submitPick } from '@/lib/live-draft-engine/PickSubmissionService'
import { finalizeRosterAssignments } from '@/lib/live-draft-engine/RosterAssignmentService'

export const dynamic = 'force-dynamic'

const ALLOWED_ACTIONS = ['pause', 'resume', 'reset_timer', 'undo_pick', 'force_autopick', 'complete', 'set_timer_seconds', 'skip_pick', 'resolve_auction', 'reset_draft']

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId } = await ctx.params
  if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

  try {
    await assertCommissioner(leagueId, userId)
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const action = String(body?.action ?? '').toLowerCase()
  if (!ALLOWED_ACTIONS.includes(action)) {
    return NextResponse.json(
      { error: `Invalid action. Use one of: ${ALLOWED_ACTIONS.join(', ')}` },
      { status: 400 }
    )
  }

  try {
    if (action === 'pause') {
      const ok = await pauseDraftSession(leagueId)
      if (!ok) return NextResponse.json({ error: 'Cannot pause draft' }, { status: 400 })
      const { notifyDraftPaused } = await import('@/lib/draft-notifications')
      notifyDraftPaused(leagueId).catch(() => {})
      const snapshot = await buildSessionSnapshot(leagueId)
      return NextResponse.json({ ok: true, action: 'pause', session: snapshot })
    }
    if (action === 'resume') {
      const ok = await resumeDraftSession(leagueId)
      if (!ok) return NextResponse.json({ error: 'Cannot resume draft' }, { status: 400 })
      const { notifyDraftResumed } = await import('@/lib/draft-notifications')
      notifyDraftResumed(leagueId).catch(() => {})
      const snapshot = await buildSessionSnapshot(leagueId)
      return NextResponse.json({ ok: true, action: 'resume', session: snapshot })
    }
    if (action === 'reset_timer') {
      const ok = await resetTimer(leagueId)
      if (!ok) return NextResponse.json({ error: 'Cannot reset timer' }, { status: 400 })
      const snapshot = await buildSessionSnapshot(leagueId)
      return NextResponse.json({ ok: true, action: 'reset_timer', session: snapshot })
    }
    if (action === 'undo_pick') {
      const ok = await undoLastPick(leagueId)
      if (!ok) return NextResponse.json({ error: 'No pick to undo' }, { status: 400 })
      const snapshot = await buildSessionSnapshot(leagueId)
      return NextResponse.json({ ok: true, action: 'undo_pick', session: snapshot })
    }
    if (action === 'force_autopick') {
      const playerName = body.playerName ?? body.player_name
      const position = body.position ?? ''
      if (!playerName || !position) {
        return NextResponse.json({ error: 'force_autopick requires playerName and position' }, { status: 400 })
      }
      const rosterId = body.rosterId ?? undefined
      const result = await submitPick({
        leagueId,
        playerName: String(playerName).trim(),
        position: String(position).trim(),
        team: body.team ?? null,
        byeWeek: body.byeWeek ?? null,
        rosterId,
        source: 'commissioner',
      })
      if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 })
      const { notifyOnTheClockAfterPick, notifyAutoPickFired } = await import('@/lib/draft-notifications')
      if (rosterId) void notifyAutoPickFired(leagueId, rosterId, String(playerName).trim())
      void notifyOnTheClockAfterPick(leagueId)
      const snapshot = await buildSessionSnapshot(leagueId)
      return NextResponse.json({ ok: true, action: 'force_autopick', session: snapshot })
    }
    if (action === 'complete') {
      const ok = await completeDraftSession(leagueId)
      if (!ok) return NextResponse.json({ error: 'Draft not complete or already completed' }, { status: 400 })
      await finalizeRosterAssignments(leagueId).catch(() => {})
      const snapshot = await buildSessionSnapshot(leagueId)
      return NextResponse.json({ ok: true, action: 'complete', session: snapshot })
    }
    if (action === 'set_timer_seconds') {
      const seconds = Number(body.seconds ?? body.timerSeconds ?? 90)
      const resetCurrentTimer = Boolean(body.resetCurrentTimer ?? body.reset_current_timer ?? true)
      const ok = await setTimerSeconds(leagueId, seconds, { resetCurrentTimer })
      if (!ok) return NextResponse.json({ error: 'Failed to set timer' }, { status: 400 })
      const snapshot = await buildSessionSnapshot(leagueId)
      return NextResponse.json({ ok: true, action: 'set_timer_seconds', session: snapshot })
    }
    if (action === 'skip_pick') {
      const result = await submitPick({
        leagueId,
        playerName: '(Skipped)',
        position: 'SKIP',
        team: null,
        byeWeek: null,
        source: 'commissioner',
      })
      if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 })
      const snapshot = await buildSessionSnapshot(leagueId)
      return NextResponse.json({ ok: true, action: 'skip_pick', session: snapshot })
    }
    if (action === 'resolve_auction') {
      const result = await resolveAuctionWin(leagueId)
      if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 })
      const snapshot = await buildSessionSnapshot(leagueId)
      return NextResponse.json({ ok: true, action: 'resolve_auction', sold: result.sold, session: snapshot })
    }
    if (action === 'reset_draft') {
      const ok = await resetDraftSession(leagueId)
      if (!ok) return NextResponse.json({ error: 'Cannot reset draft' }, { status: 400 })
      const snapshot = await buildSessionSnapshot(leagueId)
      return NextResponse.json({ ok: true, action: 'reset_draft', session: snapshot })
    }
  } catch (e) {
    console.error('[draft/controls POST]', e)
    return NextResponse.json({ error: (e as Error).message ?? 'Server error' }, { status: 500 })
  }

  return NextResponse.json({ error: 'Unhandled action' }, { status: 400 })
}
