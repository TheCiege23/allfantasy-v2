/**
 * Pure draft-order helpers for snake, linear, and third-round reversal (3RR).
 * Single source of truth for slot math — UI and tests should use these instead of ad-hoc formulas.
 */

import type { DraftType } from '@/lib/live-draft-engine/types'
import {
  formatPickLabel,
  getSlotInRoundForOverall,
} from '@/lib/live-draft-engine/DraftOrderService'

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

export { formatPickLabel, getSlotInRoundForOverall }
