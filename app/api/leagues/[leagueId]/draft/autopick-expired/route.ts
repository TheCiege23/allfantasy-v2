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
import { getDraftUISettingsForLeague } from '@/lib/draft-defaults/DraftUISettingsResolver'
import { getDraftConfigForLeague } from '@/lib/draft-defaults/DraftRoomConfigResolver'
import { computeDraftRecommendation } from '@/lib/draft-helper/RecommendationEngine'
import { getDefaultRosterSlotsForSport } from '@/lib/draft-room'
import { getLiveADP } from '@/lib/adp-data'
import { getPlayerPoolForLeague } from '@/lib/sport-teams/SportPlayerPoolResolver'
import { getAiAdpForLeague } from '@/lib/ai-adp-engine'
import { resolveAiAdpFormatKeyFromSettings } from '@/lib/ai-adp-engine/segment-resolver'
import {
  notifyDraftIntelOnClockUrgent,
  notifyDraftIntelPickConfirmation,
  notifyDraftIntelPlayerTaken,
  notifyDraftIntelQueueReady,
  notifyDraftIntelTierBreak,
} from '@/lib/draft-notifications'
import { publishDraftIntelForUpcomingManagers, sendDraftIntelDm } from '@/lib/draft-intelligence'

type AutoPickCandidate = {
  playerName: string
  position: string
  team: string | null
  playerId: string | null
  byeWeek: number | null
  reason: string
  strategy: 'queue-first' | 'need-based' | 'bpa'
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase()
}

function getIsSuperflexFromSettings(settings: Record<string, unknown>): boolean {
  return (
    settings.is_superflex === true ||
    settings.superflex === true ||
    settings.isSuperflex === true ||
    String(settings.roster_format_type ?? '').toLowerCase().includes('superflex') ||
    String(settings.roster_format ?? '').toLowerCase().includes('superflex')
  )
}

async function loadFallbackCandidates(leagueId: string, sport: string): Promise<Array<{
  playerName: string
  position: string
  team: string | null
  playerId: string | null
  byeWeek: number | null
  adp: number | null
}>> {
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
  const uiSettings = await getDraftUISettingsForLeague(leagueId)
  if (!uiSettings.autoPickEnabled) {
    return NextResponse.json({ error: 'Auto-pick is disabled by the commissioner' }, { status: 400 })
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
  const queueHadUnavailableEntries = order.length > 0 && availableInQueue.length < order.length

  const { getAllowedPositionsAndRosterSize } = await import('@/lib/live-draft-engine/RosterFitValidation')
  const rosterRules = await getAllowedPositionsAndRosterSize(leagueId)
  const allowedPositions = rosterRules?.allowedPositions
  const firstAvailable = allowedPositions
    ? availableInQueue.find((e) => e.position && allowedPositions.has((e.position || '').trim().toUpperCase()))
    : availableInQueue[0]

  const draftConfig = await getDraftConfigForLeague(leagueId)
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { sport: true, isDynasty: true, settings: true },
  })
  const sport = String(league?.sport ?? draftSession.sportType ?? 'NFL').toUpperCase()
  const isDynasty = Boolean(league?.isDynasty)
  const settings = (league?.settings as Record<string, unknown>) ?? {}
  const isSuperflex = getIsSuperflexFromSettings(settings)
  const autopickBehavior = String(draftConfig?.autopick_behavior ?? 'queue-first').toLowerCase()

  let selected: AutoPickCandidate | null =
    firstAvailable?.playerName && firstAvailable?.position
      ? {
          playerName: firstAvailable.playerName.trim(),
          position: firstAvailable.position.trim(),
          team: firstAvailable.team ?? null,
          playerId: firstAvailable.playerId ?? null,
          byeWeek: null,
          reason: 'First available player from your queue.',
          strategy: 'queue-first',
        }
      : null

  if (!selected) {
    if (autopickBehavior === 'skip') {
      if (queueHadUnavailableEntries) {
        const { notifyQueuePlayerUnavailable } = await import('@/lib/draft-notifications')
        void notifyQueuePlayerUnavailable(leagueId, rosterId)
      }
      return NextResponse.json(
        { error: 'Auto-pick behavior is configured to skip when no queue player is available.' },
        { status: 400 }
      )
    }

    const fallbackPoolRaw = await loadFallbackCandidates(leagueId, sport)
    const fallbackPool = fallbackPoolRaw.filter((entry) => {
      if (!entry.playerName || !entry.position) return false
      if (draftedNames.has(normalizeName(entry.playerName))) return false
      if (allowedPositions && !allowedPositions.has(entry.position.trim().toUpperCase())) return false
      return true
    })

    if (fallbackPool.length === 0) {
      return NextResponse.json(
        {
          error: allowedPositions
            ? 'No eligible fallback players available for auto-pick. Add queue players or make a manual pick.'
            : 'No fallback players available for auto-pick. Add queue players or make a manual pick.',
        },
        { status: 400 }
      )
    }

    let aiAdpByKey: Record<string, number> | undefined
    if (uiSettings.aiAdpEnabled && league) {
      const formatKey = resolveAiAdpFormatKeyFromSettings(settings)
      const aiAdp = await getAiAdpForLeague(sport, isDynasty, formatKey).catch(() => null)
      if (aiAdp?.entries?.length) {
        aiAdpByKey = {}
        for (const entry of aiAdp.entries) {
          const key = `${(entry.playerName || '').toLowerCase()}|${(entry.position || '').toLowerCase()}|${(entry.team || '').toLowerCase()}`
          aiAdpByKey[key] = Number(entry.adp ?? 0)
        }
      }
    }

    if (autopickBehavior === 'need-based') {
      const rec = computeDraftRecommendation({
        available: fallbackPool.map((entry) => ({
          name: entry.playerName,
          position: entry.position,
          team: entry.team,
          adp: entry.adp,
          byeWeek: entry.byeWeek,
        })),
        teamRoster: draftSession.picks
          .filter((pick) => pick.rosterId === rosterId)
          .map((pick) => ({ position: pick.position })),
        rosterSlots: getDefaultRosterSlotsForSport(sport),
        round: current.round,
        pick: current.slot,
        totalTeams: draftSession.teamCount,
        sport,
        isDynasty,
        isSF: isSuperflex,
        mode: 'needs',
        aiAdpByKey,
      })
      const candidate = rec.recommendation?.player
      if (candidate) {
        const fromPool = fallbackPool.find(
          (entry) =>
            normalizeName(entry.playerName) === normalizeName(candidate.name) &&
            String(entry.position).toUpperCase() === String(candidate.position).toUpperCase()
        ) ?? fallbackPool[0]
        selected = {
          playerName: fromPool.playerName,
          position: fromPool.position,
          team: fromPool.team,
          playerId: fromPool.playerId,
          byeWeek: fromPool.byeWeek,
          reason: rec.recommendation?.reason || 'Need-based fallback recommendation.',
          strategy: 'need-based',
        }
      }
    }

    if (!selected) {
      const sorted = [...fallbackPool].sort((a, b) => {
        const keyA = `${normalizeName(a.playerName)}|${(a.position || '').toLowerCase()}|${(a.team || '').toLowerCase()}`
        const keyB = `${normalizeName(b.playerName)}|${(b.position || '').toLowerCase()}|${(b.team || '').toLowerCase()}`
        const adpA = aiAdpByKey?.[keyA] ?? a.adp ?? 999
        const adpB = aiAdpByKey?.[keyB] ?? b.adp ?? 999
        if (adpA !== adpB) return adpA - adpB
        return a.playerName.localeCompare(b.playerName)
      })
      const top = sorted[0]
      if (top) {
        selected = {
          playerName: top.playerName,
          position: top.position,
          team: top.team,
          playerId: top.playerId,
          byeWeek: top.byeWeek,
          reason:
            autopickBehavior === 'need-based'
              ? 'Need-based fallback unavailable; selected best ranked available player.'
              : 'Queue empty; selected best ranked available player.',
          strategy: 'bpa',
        }
      }
    }
  }

  if (!selected?.playerName || !selected.position) {
    return NextResponse.json(
      { error: 'Unable to resolve auto-pick candidate. Try manual pick.' },
      { status: 400 }
    )
  }

  const result = await submitPick({
    leagueId,
    playerName: selected.playerName.trim(),
    position: selected.position.trim(),
    team: selected.team ?? null,
    playerId: selected.playerId ?? null,
    byeWeek: selected.byeWeek ?? null,
    rosterId,
    source: 'auto',
  })

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  const { notifyAutoPickFired, notifyOnTheClockAfterPick, notifyQueuePlayerUnavailable } = await import('@/lib/draft-notifications')
  if (queueHadUnavailableEntries) {
    void notifyQueuePlayerUnavailable(leagueId, rosterId)
  }
  void notifyAutoPickFired(leagueId, rosterId, selected.playerName.trim())
  void notifyDraftIntelPickConfirmation(leagueId, rosterId, selected.playerName.trim()).catch(() => {})
  void notifyOnTheClockAfterPick(leagueId)

  try {
    const snapshot = await buildSessionSnapshot(leagueId)
    if (snapshot?.currentPick && result.snapshot) {
      await appendPickToRosterDraftSnapshot(leagueId, rosterId, {
        playerName: selected.playerName.trim(),
        position: selected.position.trim(),
        team: selected.team ?? null,
        playerId: selected.playerId ?? null,
        byeWeek: selected.byeWeek ?? null,
      }).catch(() => {})
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
      if (result.previousState?.queue.some((entry) => entry.playerName === selected.playerName.trim())) {
        await notifyDraftIntelPlayerTaken(leagueId, state.rosterId, selected.playerName.trim()).catch(() => null)
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
    submittedPlayerName: selected.playerName.trim(),
    strategy: selected.strategy,
    explanation: selected.reason,
    session: updated,
  })
}
