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
import { runAuctionAutomationTick } from '@/lib/live-draft-engine/auction'
import { runKeeperAutomationTick } from '@/lib/live-draft-engine/keeper'
import { runSlowDraftAutomationTick } from '@/lib/live-draft-engine/slow-draft/SlowDraftRuntimeService'
import { submitPick } from '@/lib/live-draft-engine/PickSubmissionService'
import { appendPickToRosterDraftSnapshot, finalizeRosterAssignments } from '@/lib/live-draft-engine/RosterAssignmentService'
import { resolveCurrentOnTheClock } from '@/lib/live-draft-engine/CurrentOnTheClockResolver'
import { resolvePickOwner } from '@/lib/live-draft-engine/PickOwnershipResolver'
import { getAllowedPositionsAndRosterSize } from '@/lib/live-draft-engine/RosterFitValidation'
import { getDraftConfigForLeague } from '@/lib/draft-defaults/DraftRoomConfigResolver'
import { getLiveADP } from '@/lib/adp-data'
import { getPlayerPoolForLeague } from '@/lib/sport-teams/SportPlayerPoolResolver'
import { prisma } from '@/lib/prisma'
import { getDraftUISettingsForLeague } from '@/lib/draft-defaults/DraftUISettingsResolver'

export const dynamic = 'force-dynamic'

const ALLOWED_ACTIONS = ['pause', 'resume', 'reset_timer', 'undo_pick', 'force_autopick', 'complete', 'set_timer_seconds', 'skip_pick', 'resolve_auction', 'auction_tick', 'slow_tick', 'keeper_tick', 'reset_draft']

type AutoPickCandidate = {
  playerName: string
  position: string
  team: string | null
  playerId: string | null
  byeWeek: number | null
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase()
}

async function loadFallbackCandidates(leagueId: string, sport: string): Promise<Array<AutoPickCandidate & { adp: number | null }>> {
  const normalizedSport = String(sport || 'NFL').toUpperCase()
  if (normalizedSport === 'NFL') {
    const adp = await getLiveADP('redraft', 300).catch(() => [])
    return adp.map((entry) => ({
      playerName: String(entry.name ?? '').trim(),
      position: String(entry.position ?? '').trim(),
      team: entry.team ?? null,
      playerId: null,
      byeWeek: entry.bye ?? null,
      adp: entry.adp ?? null,
    }))
  }

  const pool = await getPlayerPoolForLeague(leagueId, normalizedSport as any, {
    limit: 300,
  }).catch(() => [])

  return pool.map((entry: any) => ({
    playerName: String(entry.full_name ?? entry.name ?? '').trim(),
    position: String(entry.position ?? '').trim(),
    team: entry.team_abbreviation ?? null,
    playerId: entry.external_source_id ?? entry.player_id ?? null,
    byeWeek: null,
    adp: null,
  }))
}

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
    const pauseControlAction = action === 'pause' || action === 'resume' || action === 'reset_timer'
    if (pauseControlAction) {
      const uiSettings = await getDraftUISettingsForLeague(leagueId)
      if (uiSettings.commissionerPauseControlsEnabled === false) {
        return NextResponse.json(
          { error: 'Commissioner pause controls are disabled in automation settings' },
          { status: 400 }
        )
      }
    }

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
      const uiSettings = await getDraftUISettingsForLeague(leagueId)
      if (!uiSettings.commissionerForceAutoPickEnabled) {
        return NextResponse.json(
          { error: 'Commissioner force auto-pick is disabled in draft settings' },
          { status: 400 }
        )
      }
      const requestedPlayerName = String(body.playerName ?? body.player_name ?? '').trim()
      const requestedPosition = String(body.position ?? '').trim()

      const draftSession = await prisma.draftSession.findUnique({
        where: { leagueId },
        include: { picks: { orderBy: { overall: 'asc' } }, queues: true },
      })
      if (!draftSession || draftSession.status !== 'in_progress') {
        return NextResponse.json({ error: 'Draft not in progress' }, { status: 400 })
      }

      const slotOrder = (draftSession.slotOrder as { slot: number; rosterId: string; displayName: string }[]) ?? []
      const tradedPicks = Array.isArray(draftSession.tradedPicks)
        ? (draftSession.tradedPicks as {
            round: number
            originalRosterId: string
            previousOwnerName: string
            newRosterId: string
            newOwnerName: string
          }[])
        : []
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
      const onClockRosterId = String(body.rosterId ?? resolvedOwner?.rosterId ?? current.rosterId ?? '').trim()
      if (!onClockRosterId) {
        return NextResponse.json({ error: 'Unable to resolve on-clock roster for force auto-pick.' }, { status: 400 })
      }

      const rosterRules = await getAllowedPositionsAndRosterSize(leagueId)
      const allowedPositions = rosterRules?.allowedPositions
      const draftedNames = new Set(draftSession.picks.map((pick) => normalizeName(pick.playerName)))
      const uniqueKey = (candidate: AutoPickCandidate) =>
        `${normalizeName(candidate.playerName)}|${String(candidate.position ?? '').trim().toUpperCase()}`
      const seenKeys = new Set<string>()
      const candidates: AutoPickCandidate[] = []
      let queueHadUnavailableEntries = false
      const pushCandidate = (candidate: AutoPickCandidate | null | undefined) => {
        if (!candidate?.playerName || !candidate.position) return
        if (draftedNames.has(normalizeName(candidate.playerName))) return
        if (allowedPositions && !allowedPositions.has(candidate.position.trim().toUpperCase())) return
        const key = uniqueKey(candidate)
        if (seenKeys.has(key)) return
        seenKeys.add(key)
        candidates.push(candidate)
      }

      if (requestedPlayerName && requestedPosition) {
        pushCandidate({
          playerName: requestedPlayerName,
          position: requestedPosition,
          team: body.team ?? null,
          playerId: body.playerId ?? body.player_id ?? null,
          byeWeek: body.byeWeek ?? body.bye_week ?? null,
        })
      }

      const onClockRoster = await prisma.roster.findUnique({
        where: { id: onClockRosterId },
        select: { platformUserId: true },
      })
      const queueUserId =
        onClockRoster?.platformUserId && !String(onClockRoster.platformUserId).startsWith('orphan-')
          ? String(onClockRoster.platformUserId)
          : null
      if (queueUserId) {
        const queueRow = draftSession.queues.find((q) => q.userId === queueUserId)
        const queued = Array.isArray(queueRow?.order)
          ? (queueRow.order as Array<{ playerName: string; position: string; team?: string | null; playerId?: string | null }>)
          : []
        for (const item of queued) {
          if (item?.playerName && draftedNames.has(normalizeName(String(item.playerName)))) {
            queueHadUnavailableEntries = true
            continue
          }
          pushCandidate({
            playerName: String(item.playerName ?? '').trim(),
            position: String(item.position ?? '').trim(),
            team: item.team ?? null,
            playerId: item.playerId ?? null,
            byeWeek: null,
          })
        }
      }

      const league = await prisma.league.findUnique({
        where: { id: leagueId },
        select: { sport: true },
      })
      const sport = String(league?.sport ?? draftSession.sportType ?? 'NFL').toUpperCase()
      const fallbackPool = await loadFallbackCandidates(leagueId, sport)
      const fallbackSorted = [...fallbackPool].sort((a, b) => {
        const adpA = a.adp ?? 999
        const adpB = b.adp ?? 999
        if (adpA !== adpB) return adpA - adpB
        return a.playerName.localeCompare(b.playerName)
      })
      for (const player of fallbackSorted) {
        pushCandidate({
          playerName: player.playerName,
          position: player.position,
          team: player.team,
          playerId: player.playerId,
          byeWeek: player.byeWeek,
        })
      }

      if (!candidates.length) {
        return NextResponse.json(
          { error: 'No eligible auto-pick candidate found for the current on-clock roster.' },
          { status: 400 }
        )
      }

      let result: Awaited<ReturnType<typeof submitPick>> | null = null
      let selectedCandidate: AutoPickCandidate | null = null
      const attempts = candidates.slice(0, 80)
      for (const candidate of attempts) {
        const attempt = await submitPick({
          leagueId,
          playerName: candidate.playerName,
          position: candidate.position,
          team: candidate.team,
          playerId: candidate.playerId,
          byeWeek: candidate.byeWeek,
          rosterId: onClockRosterId,
          source: 'commissioner',
        })
        if (attempt.success) {
          result = attempt
          selectedCandidate = candidate
          break
        }
      }

      if (!result?.success || !selectedCandidate) {
        return NextResponse.json({ error: result?.error ?? 'Unable to auto-pick a valid player.' }, { status: 400 })
      }
      if (result.snapshot?.rosterId) {
        void appendPickToRosterDraftSnapshot(leagueId, result.snapshot.rosterId, {
          playerName: selectedCandidate.playerName,
          position: selectedCandidate.position,
          team: selectedCandidate.team,
          playerId: selectedCandidate.playerId,
          byeWeek: selectedCandidate.byeWeek,
        }).catch(() => {})
      }
      const { notifyOnTheClockAfterPick, notifyAutoPickFired, notifyQueuePlayerUnavailable } = await import('@/lib/draft-notifications')
      if (queueHadUnavailableEntries) {
        void notifyQueuePlayerUnavailable(leagueId, onClockRosterId)
      }
      void notifyAutoPickFired(leagueId, onClockRosterId, selectedCandidate.playerName)
      void notifyOnTheClockAfterPick(leagueId)
      const snapshot = await buildSessionSnapshot(leagueId)
      return NextResponse.json({
        ok: true,
        action: 'force_autopick',
        selectedPlayerName: selectedCandidate.playerName,
        selectedPosition: selectedCandidate.position,
        session: snapshot,
      })
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
      const draftConfig = await getDraftConfigForLeague(leagueId)
      const skipAllowed = String(draftConfig?.autopick_behavior ?? '').toLowerCase() === 'skip'
      if (!skipAllowed) {
        return NextResponse.json(
          { error: 'Skip pick is disabled by league auto-pick rules (set auto-pick behavior to skip).' },
          { status: 400 }
        )
      }
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
      const result = await resolveAuctionWin(leagueId, { force: true, now: new Date() })
      if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 })
      if (result.sold) {
        try {
          const { isSalaryCapLeague, getSalaryCapConfig } = await import('@/lib/salary-cap/SalaryCapLeagueConfig')
          const { assignStartupAuctionContract } = await import('@/lib/salary-cap/AuctionStartupService')
          if (await isSalaryCapLeague(leagueId)) {
            const draftSession = await prisma.draftSession.findUnique({ where: { leagueId } })
            if (draftSession) {
              const latestPick = await prisma.draftPick.findFirst({
                where: { sessionId: draftSession.id },
                orderBy: { overall: 'desc' },
                select: { id: true },
              })
              if (latestPick) {
                const config = await getSalaryCapConfig(leagueId)
                const contractYears = config?.contractMaxYears ?? 4
                const assign = await assignStartupAuctionContract(leagueId, latestPick.id, contractYears)
                if (!assign.ok) console.warn('[draft/controls] assignStartupAuctionContract:', assign.error)
              }
            }
          }
        } catch (e) {
          console.warn('[draft/controls] Salary cap assign startup contract non-fatal:', e)
        }
      }
      const snapshot = await buildSessionSnapshot(leagueId)
      if (snapshot?.status === 'completed') {
        await finalizeRosterAssignments(leagueId).catch(() => {})
        const { runSurvivorPostDraftBootstrap } = await import('@/lib/survivor/SurvivorDraftBootstrapService')
        await runSurvivorPostDraftBootstrap(leagueId).catch(() => {})
      }
      return NextResponse.json({ ok: true, action: 'resolve_auction', sold: result.sold, session: snapshot })
    }
    if (action === 'auction_tick') {
      const automation = await runAuctionAutomationTick(leagueId)
      const snapshot = await buildSessionSnapshot(leagueId)
      return NextResponse.json({
        ok: true,
        action: 'auction_tick',
        changed: automation.changed,
        automationActions: automation.actions,
        session: snapshot,
      })
    }
    if (action === 'slow_tick') {
      const automation = await runSlowDraftAutomationTick(leagueId)
      const snapshot = await buildSessionSnapshot(leagueId)
      return NextResponse.json({
        ok: true,
        action: 'slow_tick',
        changed: automation.changed,
        automationActions: automation.actions,
        session: snapshot,
      })
    }
    if (action === 'keeper_tick') {
      const automation = await runKeeperAutomationTick(leagueId)
      const snapshot = await buildSessionSnapshot(leagueId)
      return NextResponse.json({
        ok: true,
        action: 'keeper_tick',
        changed: automation.changed,
        automationActions: automation.actions,
        session: snapshot,
      })
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
