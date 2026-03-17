/**
 * Resolve who is currently on the clock for a draft session.
 */

import { getSlotInRoundForOverall, formatPickLabel } from './DraftOrderService'
import type { CurrentOnTheClock, SlotOrderEntry } from './types'

export interface ResolveOnTheClockInput {
  totalPicks: number
  picksCount: number
  teamCount: number
  draftType: 'snake' | 'linear' | 'auction'
  thirdRoundReversal: boolean
  slotOrder: SlotOrderEntry[]
}

/**
 * Returns the current pick (on the clock) or null if draft is complete or not started.
 */
export function resolveCurrentOnTheClock(input: ResolveOnTheClockInput): CurrentOnTheClock | null {
  const { totalPicks, picksCount, teamCount, draftType, thirdRoundReversal, slotOrder } = input
  if (picksCount >= totalPicks || slotOrder.length === 0) return null
  const overall = picksCount + 1
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
