/**
 * Deterministic pick order for snake / linear / third-round reversal.
 * (Distinct from `lib/draft/pick-order.ts` mock invite order helpers.)
 */

export type DraftPickOrderSlot = {
  overallPick: number
  round: number
  roundPick: number
  /** Draft slot / team column (1-indexed). */
  slot: number
}

export type DraftOrderOwner = {
  slot: number
  ownerId: string
  ownerName: string
  avatarUrl?: string | null
}

function directionForRound(
  round: number,
  draftType: 'snake' | 'linear',
  thirdRoundReversal: boolean,
): 'forward' | 'reverse' {
  if (draftType === 'linear') return 'forward'
  if (!thirdRoundReversal) {
    return round % 2 === 1 ? 'forward' : 'reverse'
  }
  // Third-round reversal: R1 forward, R2 reverse, R3 reverse (same as R2), R4 forward, R5 reverse, ...
  if (round === 1) return 'forward'
  if (round === 2) return 'reverse'
  if (round === 3) return 'reverse'
  return round % 2 === 0 ? 'forward' : 'reverse'
}

export function buildPickOrder(
  teamCount: number,
  rounds: number,
  draftType: 'snake' | 'linear',
  thirdRoundReversal = false,
): DraftPickOrderSlot[] {
  const n = Math.max(1, teamCount)
  const rMax = Math.max(1, rounds)
  const out: DraftPickOrderSlot[] = []

  for (let round = 1; round <= rMax; round++) {
    const dir = directionForRound(round, draftType, thirdRoundReversal)
    const orderSlots =
      dir === 'forward' ? Array.from({ length: n }, (_, i) => i + 1) : Array.from({ length: n }, (_, i) => n - i)

    for (let i = 0; i < n; i++) {
      const roundPick = i + 1
      const overallPick = (round - 1) * n + roundPick
      out.push({
        overallPick,
        round,
        roundPick,
        slot: orderSlots[i]!,
      })
    }
  }

  return out
}

export function getPickOwner(
  slot: number,
  draftOrder: { slot: number; ownerId: string; ownerName: string }[],
): { ownerId: string; ownerName: string } | null {
  const row = draftOrder.find((d) => d.slot === slot)
  if (!row) return null
  return { ownerId: row.ownerId, ownerName: row.ownerName }
}

export function getCurrentPicker(
  picks: DraftPickOrderSlot[],
  currentOverallPick: number,
  draftOrder: DraftOrderOwner[],
): { slot: number; ownerId: string; ownerName: string } | null {
  const next = picks.find((p) => p.overallPick === currentOverallPick)
  if (!next) return null
  const o = getPickOwner(next.slot, draftOrder)
  if (!o) return null
  return { slot: next.slot, ownerId: o.ownerId, ownerName: o.ownerName }
}
