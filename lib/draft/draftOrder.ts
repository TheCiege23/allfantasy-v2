/**
 * Pure draft-order helpers for snake, linear, and third-round reversal (3RR).
 * Single source of truth for slot math — UI and tests should use these instead of ad-hoc formulas.
 */

import type { DraftType } from '@/lib/live-draft-engine/types'
import {
  formatPickLabel,
  getSlotInRoundForOverall,
  getUpcomingPickOwners,
} from '@/lib/live-draft-engine/DraftOrderService'
import type { SlotOrderEntry } from '@/lib/live-draft-engine/types'

export type DraftFormat = DraftType

export function getRoundFromOverall(overall: number, teamCount: number): number {
  if (teamCount < 1) return 1
  return Math.ceil(overall / teamCount)
}

/** 1-based index of pick within the round (1 … teamCount). */
export function getPickIndexInRound(overall: number, teamCount: number): number {
  if (teamCount < 1) return 1
  return ((overall - 1) % teamCount) + 1
}

/** Alias for pick index in round (product spec naming). */
export function getPickInRound(overall: number, teamCount: number): number {
  return getPickIndexInRound(overall, teamCount)
}

/**
 * Draft slot (1-based) for snake without 3RR, derived from round + pick index in round.
 */
export function getSnakeSlot(round: number, pickIndexInRound: number, teamCount: number): number {
  const overall = (round - 1) * teamCount + pickIndexInRound
  return getSlotInRoundForOverall({
    overall,
    teamCount,
    draftType: 'snake',
    thirdRoundReversal: false,
  })
}

/**
 * Draft slot with 3RR — delegates to shared engine (same rules as live draft).
 */
export function get3RRSlot(round: number, pickIndexInRound: number, teamCount: number): number {
  const overall = (round - 1) * teamCount + pickIndexInRound
  return getSlotInRoundForOverall({
    overall,
    teamCount,
    draftType: 'snake',
    thirdRoundReversal: true,
  })
}

export function getLinearSlot(pickIndexInRound: number): number {
  return pickIndexInRound
}

export function getManagerForOverallPick(
  overall: number,
  managers: Array<{ slot: number; rosterId: string; displayName: string }>,
  format: DraftFormat,
  enable3RR: boolean,
  teamCount: number,
): { rosterId: string; displayName: string; slot: number } | null {
  const slot = getSlotInRoundForOverall({
    overall,
    teamCount,
    draftType: format === 'linear' ? 'linear' : 'snake',
    thirdRoundReversal: format === 'snake' && enable3RR,
  })
  const entry = managers.find((m) => m.slot === slot)
  return entry ? { rosterId: entry.rosterId, displayName: entry.displayName, slot } : null
}

/** Current team roster id for this overall pick (alias for product docs). */
export function getCurrentTeamForPick(
  overall: number,
  managers: Array<{ slot: number; rosterId: string; displayName: string }>,
  format: DraftFormat,
  enable3RR: boolean,
  teamCount: number,
): string | null {
  return getManagerForOverallPick(overall, managers, format, enable3RR, teamCount)?.rosterId ?? null
}

/**
 * Next `count` teams on deck after `nextOverall` (same as live sidebar / intel).
 */
export function getNextTeamsOnDeck(params: {
  nextOverall: number
  count: number
  teamCount: number
  draftType: DraftFormat
  thirdRoundReversal: boolean
  slotOrder: SlotOrderEntry[]
  totalPicks: number
}): Array<{ rosterId: string; displayName: string; slot: number }> {
  return getUpcomingPickOwners(
    params.nextOverall,
    params.count,
    params.teamCount,
    params.draftType,
    params.thirdRoundReversal,
    params.slotOrder,
    params.totalPicks,
  )
}

export function isDraftComplete(picksCount: number, totalPicks: number): boolean {
  return totalPicks > 0 && picksCount >= totalPicks
}

/**
 * Timestamp-based remaining seconds for UI: `remaining = timerEndAt - now` (never negative).
 */
export function getTimerRemaining(timerEndAtIso: string | null | undefined, nowMs: number = Date.now()): number {
  if (!timerEndAtIso) return 0
  const end = new Date(timerEndAtIso).getTime()
  if (!Number.isFinite(end)) return 0
  return Math.max(0, Math.ceil((end - nowMs) / 1000))
}

export type BoardMatrixCell = {
  round: number
  overall: number
  pickInRound: number
  slot: number
}

/**
 * Build flat list of (round, overall, pickInRound, owner slot) for sequential drafts — useful for tests / tools.
 */
export function buildBoardMatrix(
  rounds: number,
  teamCount: number,
  draftType: 'snake' | 'linear',
  thirdRoundReversal: boolean,
): BoardMatrixCell[] {
  const totalPicks = rounds * teamCount
  const out: BoardMatrixCell[] = []
  for (let overall = 1; overall <= totalPicks; overall += 1) {
    const round = getRoundFromOverall(overall, teamCount)
    const pickInRound = getPickInRound(overall, teamCount)
    const slot = getSlotInRoundForOverall({
      overall,
      teamCount,
      draftType,
      thirdRoundReversal: draftType === 'snake' && thirdRoundReversal,
    })
    out.push({ round, overall, pickInRound, slot })
  }
  return out
}

export function getTimeRemaining(
  lastPickAt: Date | null,
  secondsPerPick: number,
  now: Date,
): number {
  if (!lastPickAt || secondsPerPick <= 0) return secondsPerPick
  const elapsedSec = Math.floor((now.getTime() - lastPickAt.getTime()) / 1000)
  return Math.max(0, secondsPerPick - elapsedSec)
}

export function canUserDraft(
  isDraftStarted: boolean,
  draftComplete: boolean,
  isUsersTurn: boolean,
): boolean {
  return isDraftStarted && !draftComplete && isUsersTurn
}

export { formatPickLabel, getSlotInRoundForOverall, getUpcomingPickOwners }
