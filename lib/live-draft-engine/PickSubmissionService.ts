/**
 * Pick submission: validate, persist, advance timer, optional roster append.
 * Uses transaction to avoid race conditions (duplicate picks, wrong order).
 */

import { prisma } from '@/lib/prisma'
import { getRosterIdForOverall } from './DraftOrderService'
import { computeTimerEndAt } from './DraftTimerService'
import { validatePickSubmission, validateDevyEligibilityAsync, validateC2CEligibilityAsync } from './PickValidation'
import { resolveCurrentOnTheClock } from './CurrentOnTheClockResolver'
import { resolvePickOwner } from './PickOwnershipResolver'
import type { SlotOrderEntry } from './types'

export interface SubmitPickInput {
  leagueId: string
  playerName: string
  position: string
  team?: string | null
  byeWeek?: number | null
  playerId?: string | null
  rosterId?: string | null
  source?: 'user' | 'auto' | 'commissioner'
  tradedPicks?: { round: number; originalRosterId: string; previousOwnerName: string; newRosterId: string; newOwnerName: string }[]
}

export interface SubmitPickResult {
  success: boolean
  error?: string
  snapshot?: { sessionId: string; overall: number; pickLabel: string }
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
  const validation = validatePickSubmission({
    playerName: input.playerName,
    position: input.position,
    rosterId: effectiveRosterId,
    currentOnClockRosterId: current.rosterId,
    existingPicks: session.picks.map((p) => ({ playerName: p.playerName, position: p.position })),
    sessionStatus: session.status,
  })
  if (!validation.valid) return { success: false, error: validation.error }

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
      { currentRound: roundForEligibility, playerName: input.playerName, devyConfig },
      prisma
    )
    if (!devyValidation.valid) return { success: false, error: devyValidation.error }
  }

  const owner = resolvePickOwner(round, slot, slotOrder, input.tradedPicks ?? tradedPicks)
  const displayName = owner?.displayName ?? current.displayName
  const tradedPickMeta = owner?.tradedPickMeta ?? null

  const timerSeconds = session.timerSeconds ?? 90
  const nextTimerEndAt = computeTimerEndAt(timerSeconds)

  const pick = await prisma.$transaction(async (tx) => {
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

  const pickLabel = `${round}.${slot.toString().padStart(2, '0')}`
  return {
    success: true,
    snapshot: { sessionId: session.id, overall: pick.overall, pickLabel },
  }
}
