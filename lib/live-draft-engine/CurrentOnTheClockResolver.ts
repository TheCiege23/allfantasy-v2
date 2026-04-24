/**
 * Resolve who is currently on the clock for a draft session.
 */

import { getSlotInRoundForOverall, formatPickLabel } from './DraftOrderService'
import { resolveNextOpenPickOverall } from './draftPickEmpty'
import type { CurrentOnTheClock, SlotOrderEntry } from './types'

export interface ResolveOnTheClockInput {
  totalPicks: number
  /** When `picks` is omitted, legacy contiguous board: next overall = picksCount + 1. */
  picksCount?: number
  /** When set, next pick is the first missing or commissioner-cleared empty overall (no renumbering). */
  picks?: Array<{ overall: number; playerName: string; position: string; pickMetadata?: unknown | null }>
  teamCount: number
  draftType: 'snake' | 'linear' | 'auction'
  thirdRoundReversal: boolean
  slotOrder: SlotOrderEntry[]
}

/**
 * Returns the current pick (on the clock) or null if draft is complete or not started.
 */
export function resolveCurrentOnTheClock(input: ResolveOnTheClockInput): CurrentOnTheClock | null {
  const { totalPicks, picksCount, teamCount, draftType, thirdRoundReversal, slotOrder, picks } = input
  if (slotOrder.length === 0 || totalPicks < 1) return null

  let overall: number | null
  if (picks) {
    overall = resolveNextOpenPickOverall(picks, totalPicks)
  } else {
    const n = picksCount ?? 0
    if (n >= totalPicks) return null
    overall = n + 1
  }
  if (overall == null) return null
  const round = Math.ceil(overall / teamCount)
  const slot = getSlotInRoundForOverall({
    overall,
    teamCount,
    draftType,
    thirdRoundReversal,
  })
  const entry = slotOrder.find((e) => e.slot === slot)
  if (!entry) return null
  return {
    overall,
    round,
    slot,
    rosterId: entry.rosterId,
    displayName: entry.displayName,
    pickLabel: formatPickLabel(overall, teamCount),
  }
}
