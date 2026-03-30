/**
 * Pick submission: validate, persist, advance timer, optional roster append.
 * Uses transaction to avoid race conditions (duplicate picks, wrong order).
 */

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { computeTimerEndAt } from './DraftTimerService'
import { validatePickSubmission, validateDevyEligibilityAsync, validateC2CEligibilityAsync } from './PickValidation'
import { validateRosterFitForDraftPick } from './RosterFitValidation'
import { resolveCurrentOnTheClock } from './CurrentOnTheClockResolver'
import { resolvePickOwner } from './PickOwnershipResolver'
import { getDraftUISettingsForLeague } from '@/lib/draft-defaults/DraftUISettingsResolver'
import { getManagerColorBySeed } from '@/lib/draft-room'
import { completeDraftSession } from './DraftSessionService'
import { recordTrendSignalByPlayerId } from '@/lib/player-trend/signal-integration'
import { resolveSportForTrend } from '@/lib/player-trend/SportTrendContextResolver'
import type { SlotOrderEntry } from './types'
import { buildKeeperLocks } from './keeper/KeeperDraftOrder'
import type { KeeperConfig, KeeperSelection } from './keeper/types'

export interface SubmitPickInput {
  leagueId: string
  playerName: string
  position: string
  team?: string | null
  byeWeek?: number | null
  playerId?: string | null
  rosterId?: string | null
  source?: 'user' | 'auto' | 'commissioner' | 'keeper' | 'devy' | 'college' | 'promoted_devy'
  tradedPicks?: { round: number; originalRosterId: string; previousOwnerName: string; newRosterId: string; newOwnerName: string }[]
}

export interface SubmitPickResult {
  success: boolean
  error?: string
  snapshot?: { sessionId: string; overall: number; pickLabel: string; rosterId: string }
}

/**
 * Submit a pick. Validates slot, duplicate, then writes in a transaction.
 */
export async function submitPick(input: SubmitPickInput): Promise<SubmitPickResult> {
  const session = await prisma.draftSession.findUnique({
    where: { leagueId: input.leagueId },
    include: { picks: { orderBy: { overall: 'asc' } } },
  })
  if (!session) return { success: false, error: 'Draft session not found' }

  const slotOrder = (session.slotOrder as unknown as SlotOrderEntry[]) ?? []
  const tradedPicksRaw = (session as any).tradedPicks
  const tradedPicks = Array.isArray(tradedPicksRaw) ? tradedPicksRaw : []
  const teamCount = session.teamCount
  const totalPicks = session.rounds * teamCount
  const picksCount = session.picks.length
  const current = resolveCurrentOnTheClock({
    totalPicks,
    picksCount,
    teamCount,
    draftType: session.draftType as 'snake' | 'linear' | 'auction',
    thirdRoundReversal: session.thirdRoundReversal,
    slotOrder,
  })
  if (!current) return { success: false, error: 'Draft is complete or not started' }

  const overall = picksCount + 1
  const round = Math.ceil(overall / teamCount)
  const slot = current.slot
  const resolvedOwner = resolvePickOwner(round, slot, slotOrder, tradedPicks)
  const effectiveRosterId = input.rosterId ?? resolvedOwner?.rosterId ?? current.rosterId
  const onClockRosterId = resolvedOwner?.rosterId ?? current.rosterId
  const validation = validatePickSubmission({
    playerName: input.playerName,
    position: input.position,
    rosterId: effectiveRosterId,
    currentOnClockRosterId: onClockRosterId,
    existingPicks: session.picks.map((p) => ({ playerName: p.playerName, position: p.position })),
    sessionStatus: session.status,
  })
  if (!validation.valid) return { success: false, error: validation.error }

  const keeperConfig = (session.keeperConfig ?? (session as any).keeperConfig) as KeeperConfig | null
  const keeperSelections = (session.keeperSelections ?? (session as any).keeperSelections) as KeeperSelection[] | null
  if (keeperConfig?.maxKeepers && Array.isArray(keeperSelections) && keeperSelections.length > 0) {
    const keeperLocks = buildKeeperLocks(
      keeperSelections,
      slotOrder,
      tradedPicks,
      teamCount,
      session.rounds,
      session.draftType as 'snake' | 'linear' | 'auction',
      session.thirdRoundReversal
    )
    const lock = keeperLocks.find((item) => item.round === round && item.slot === slot)
    if (lock && input.source !== 'keeper') {
      return { success: false, error: 'This slot is keeper-locked and will be auto-applied.' }
    }
    if (lock && input.source === 'keeper') {
      if (lock.playerName.trim().toLowerCase() !== input.playerName.trim().toLowerCase()) {
        return { success: false, error: 'Keeper lock mismatch for this slot.' }
      }
    }
  }

  const rosterFit = await validateRosterFitForDraftPick({
    leagueId: input.leagueId,
    rosterId: effectiveRosterId,
    existingPicks: session.picks.map((p) => ({ rosterId: p.rosterId, position: p.position })),
    newPickPosition: input.position,
  })
  if (!rosterFit.valid) return { success: false, error: rosterFit.error }

  const roundForEligibility = Math.ceil((picksCount + 1) / teamCount) || 1
  const rawC2cConfig = session.c2cConfig ?? (session as any).c2cConfig
  const c2cConfig =
    rawC2cConfig && typeof rawC2cConfig === 'object' && (rawC2cConfig as any).enabled
      ? { enabled: true, collegeRounds: Array.isArray((rawC2cConfig as any).collegeRounds) ? (rawC2cConfig as any).collegeRounds : [] }
      : null
  const rawDevyConfig = session.devyConfig ?? (session as any).devyConfig
  const devyConfig =
    rawDevyConfig && typeof rawDevyConfig === 'object' && (rawDevyConfig as any).enabled
      ? { enabled: true, devyRounds: Array.isArray((rawDevyConfig as any).devyRounds) ? (rawDevyConfig as any).devyRounds : [] }
      : null

  if (c2cConfig?.enabled) {
    const c2cValidation = await validateC2CEligibilityAsync(
      { currentRound: roundForEligibility, playerName: input.playerName, c2cConfig },
      prisma
    )
    if (!c2cValidation.valid) return { success: false, error: c2cValidation.error }
  } else if (devyConfig?.enabled) {
    const devyValidation = await validateDevyEligibilityAsync(
      { currentRound: roundForEligibility, playerName: input.playerName, position: input.position, devyConfig },
      prisma
    )
    if (!devyValidation.valid) return { success: false, error: devyValidation.error }
  }

  const owner = resolvePickOwner(round, slot, slotOrder, input.tradedPicks ?? tradedPicks)
  const displayName = owner?.displayName ?? current.displayName
  const uiSettings = await getDraftUISettingsForLeague(input.leagueId)
  let tradedPickMeta = owner?.tradedPickMeta ? { ...owner.tradedPickMeta } : null
  if (tradedPickMeta) {
    tradedPickMeta.showNewOwnerInRed = Boolean(uiSettings.tradedPickOwnerNameRedEnabled)
    if (uiSettings.tradedPickColorModeEnabled) {
      const seed = String(tradedPickMeta.newOwnerName ?? owner?.rosterId ?? displayName ?? 'manager')
      tradedPickMeta.tintColor = getManagerColorBySeed(seed).tintHex
    } else {
      delete tradedPickMeta.tintColor
    }
  }

  const timerSeconds = session.timerSeconds ?? 90
  const nextTimerEndAt = computeTimerEndAt(timerSeconds)

  let pick: any
  try {
    pick = await prisma.$transaction(async (tx) => {
      const locked = await (tx as any).draftSession.findUnique({
        where: { id: session.id },
        include: { picks: { orderBy: { overall: 'asc' } } },
      })
      if (!locked || locked.picks.length !== picksCount) {
        throw new Error('Draft state changed; please retry')
      }
      const created = await (tx as any).draftPick.create({
        data: {
          sessionId: session.id,
          sportType: (session as any).sportType ?? null,
          overall,
          round,
          slot,
          rosterId: effectiveRosterId,
          displayName,
          playerName: input.playerName.trim(),
          position: input.position,
          team: input.team ?? null,
          byeWeek: input.byeWeek ?? null,
          playerId: input.playerId ?? null,
          tradedPickMeta: tradedPickMeta ? (tradedPickMeta as any) : undefined,
          source: input.source ?? 'user',
        },
      })
      await (tx as any).draftSession.update({
        where: { id: session.id },
        data: {
          timerEndAt: nextTimerEndAt,
          pausedRemainingSeconds: null,
          status: 'in_progress',
          version: { increment: 1 },
          updatedAt: new Date(),
        },
      })
      return created
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { success: false, error: 'Draft state changed; please retry' }
    }
    if (error instanceof Error && /Draft state changed/.test(error.message)) {
      return { success: false, error: 'Draft state changed; please retry' }
    }
    throw error
  }

  const pickLabel = `${round}.${slot.toString().padStart(2, '0')}`

  // Trend detection signals are best-effort and should never block draft picks.
  try {
    const league = await prisma.league.findUnique({
      where: { id: input.leagueId },
      select: { sport: true },
    })
    const sport = resolveSportForTrend(league?.sport)
    let resolvedPlayerId = pick.playerId ?? input.playerId ?? null
    if (!resolvedPlayerId) {
      const byName = await prisma.player.findFirst({
        where: {
          sport,
          name: { equals: input.playerName.trim(), mode: 'insensitive' },
        },
        select: { id: true },
      })
      resolvedPlayerId = byName?.id ?? null
    }

    if (resolvedPlayerId) {
      await recordTrendSignalByPlayerId({
        playerId: resolvedPlayerId,
        sport,
        signalType: 'draft_pick',
        leagueId: input.leagueId,
        updateAfter: true,
      })

      if (input.source === 'auto') {
        await recordTrendSignalByPlayerId({
          playerId: resolvedPlayerId,
          sport,
          signalType: 'ai_recommendation',
          leagueId: input.leagueId,
          value: 1,
          updateAfter: false,
        })
      }
    }
  } catch {
    // non-fatal
  }

  if (overall >= totalPicks) {
    await completeDraftSession(input.leagueId).catch(() => {})
  }

  return {
    success: true,
    snapshot: { sessionId: session.id, overall: pick.overall, pickLabel, rosterId: effectiveRosterId },
  }
}
