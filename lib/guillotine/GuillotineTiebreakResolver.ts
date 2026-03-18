/**
 * Deterministic tiebreaker for guillotine elimination.
 * Order: season_points (higher survives) -> previous_period (higher survives) -> draft_slot (better slot loses in week 1) -> commissioner (manual) -> random.
 */

import type { PeriodScoreRow } from './types'
import type { TiebreakStep } from './types'

/** Draft slot by rosterId (1-based; 1 = first pick). Used for week-1 tiebreak: lower slot = eliminated first when tied. */
export type DraftSlotByRoster = Map<string, number>

/**
 * Resolve which roster(s) are "lowest" when period points are tied.
 * Returns the rosterIds that should be chopped (up to teamsPerChop), in order.
 * order is worst-first; steps are applied in tiebreakerOrder until we have a unique ordering for the bottom N.
 */
export function resolveTiebreak(args: {
  candidates: PeriodScoreRow[]
  tiebreakerOrder: TiebreakStep[]
  teamsPerChop: number
  weekOrPeriod: number
  draftSlotByRoster: DraftSlotByRoster
  /** If commissioner already chose who to chop (override). */
  commissionerChoppedRosterIds?: string[]
}): {
  choppedRosterIds: string[]
  stepUsed: TiebreakStep | null
  reason: string
} {
  const {
    candidates,
    tiebreakerOrder,
    teamsPerChop,
    weekOrPeriod,
    draftSlotByRoster,
    commissionerChoppedRosterIds = [],
  } = args

  if (candidates.length === 0) {
    return { choppedRosterIds: [], stepUsed: null, reason: 'no candidates' }
  }

  if (commissionerChoppedRosterIds.length >= teamsPerChop) {
    const valid = commissionerChoppedRosterIds.filter((id) => candidates.some((c) => c.rosterId === id))
    return {
      choppedRosterIds: valid.slice(0, teamsPerChop),
      stepUsed: 'commissioner',
      reason: 'commissioner override',
    }
  }

  const minPeriodPoints = Math.min(...candidates.map((c) => c.periodPoints))
  const tied = candidates.filter((c) => c.periodPoints === minPeriodPoints)
  if (tied.length === 0) {
    return { choppedRosterIds: [], stepUsed: null, reason: 'no tied candidates' }
  }

  let ordered: PeriodScoreRow[] = [...tied]
  let stepUsed: TiebreakStep | null = null

  for (const step of tiebreakerOrder) {
    if (ordered.length <= teamsPerChop) break
    if (step === 'commissioner') {
      if (commissionerChoppedRosterIds.length > 0) {
        const overrideSet = new Set(commissionerChoppedRosterIds)
        ordered = ordered.filter((r) => overrideSet.has(r.rosterId))
        stepUsed = 'commissioner'
        break
      }
      continue
    }
    if (step === 'random') {
      stepUsed = 'random'
      ordered = shuffleAndTake(ordered, ordered.length)
      break
    }

    if (step === 'season_points') {
      ordered = [...ordered].sort((a, b) => a.seasonPointsCumul - b.seasonPointsCumul)
      stepUsed = 'season_points'
      const stillTied = groupByKey(ordered, (r) => r.seasonPointsCumul)
      const lowestGroup = stillTied[0]
      if (lowestGroup && lowestGroup.length < ordered.length) ordered = lowestGroup
      if (ordered.length <= teamsPerChop) break
    } else if (step === 'previous_period') {
      ordered = [...ordered].sort((a, b) => (a.previousPeriodPoints ?? 0) - (b.previousPeriodPoints ?? 0))
      stepUsed = 'previous_period'
      const stillTied = groupByKey(ordered, (r) => r.previousPeriodPoints ?? -1)
      const lowestGroup = stillTied[0]
      if (lowestGroup && lowestGroup.length < ordered.length) ordered = lowestGroup
      if (ordered.length <= teamsPerChop) break
    } else if (step === 'draft_slot') {
      if (weekOrPeriod <= 1) {
        ordered = [...ordered].sort((a, b) => {
          const slotA = draftSlotByRoster.get(a.rosterId) ?? 9999
          const slotB = draftSlotByRoster.get(b.rosterId) ?? 9999
          return slotB - slotA
        })
        stepUsed = 'draft_slot'
        const stillTied = groupByKey(
          ordered,
          (r) => draftSlotByRoster.get(r.rosterId) ?? 9999
        )
        const worstSlotGroup = stillTied[0]
        if (worstSlotGroup && worstSlotGroup.length < ordered.length) ordered = worstSlotGroup
      }
      if (ordered.length <= teamsPerChop) break
    }
  }

  const toChop = ordered.slice(0, teamsPerChop).map((r) => r.rosterId)
  return {
    choppedRosterIds: toChop,
    stepUsed,
    reason: stepUsed ? `tiebreak: ${stepUsed}` : 'lowest period score',
  }
}

function groupByKey<T>(sorted: T[], key: (t: T) => number): T[][] {
  const groups: T[][] = []
  let current: T[] = []
  let lastKey: number | undefined
  for (const t of sorted) {
    const k = key(t)
    if (lastKey !== undefined && k !== lastKey) {
      groups.push(current)
      current = []
    }
    current.push(t)
    lastKey = k
  }
  if (current.length) groups.push(current)
  return groups
}

function shuffleAndTake<T>(arr: T[], n: number): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out.slice(0, n)
}
