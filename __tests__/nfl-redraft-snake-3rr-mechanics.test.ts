/**
 * NFL redraft snake draft — pick mechanics + 3RR behavior lock (Commit G).
 *
 * The pick-order helpers in `lib/draft/draftOrder.ts` and the canonical
 * `getSlotInRoundForOverall` resolver in
 * `lib/live-draft-engine/DraftOrderService.ts` have been the single source of
 * truth for snake/3RR for several slices — see `__tests__/draft/draftOrder.test.ts`
 * and `__tests__/draft/pick-order-mechanics.test.ts`. This file is a
 * dashboard-side regression-lock that exercises the canonical helpers on the
 * NFL redraft fixture (12-team, 16-round) so a future refactor on the league
 * dashboard branch can't silently drift the contract:
 *
 *   - standard snake: R1 1→12, R2 12→1, R3 1→12, R4 12→1, …
 *   - 3RR: R1 1→12, R2 12→1, R3 12→1, R4 1→12, R5 12→1, …
 *
 * The 3RR variant is what the audit + Commit E referenced as the
 * "thirdRoundReversal" knob on `DraftSession`; this lock pins the slot math
 * end-to-end so anyone touching the resolver sees the failure here as well
 * as in the lower-level engine tests.
 */

import { describe, expect, it } from 'vitest'
import {
  buildBoardMatrix,
  get3RRSlot,
  getManagerForOverallPick,
  getPickInRound,
  getRoundFromOverall,
  getSnakeSlot,
} from '@/lib/draft/draftOrder'
import { getSlotInRoundForOverall } from '@/lib/live-draft-engine/DraftOrderService'

const TEAM_COUNT = 12

function slotsForRound(round: number, thirdRoundReversal: boolean): number[] {
  const out: number[] = []
  for (let pickInRound = 1; pickInRound <= TEAM_COUNT; pickInRound += 1) {
    const overall = (round - 1) * TEAM_COUNT + pickInRound
    out.push(
      getSlotInRoundForOverall({
        overall,
        teamCount: TEAM_COUNT,
        draftType: 'snake',
        thirdRoundReversal,
      }),
    )
  }
  return out
}

describe('Standard snake order (12-team, no 3RR)', () => {
  it('R1 runs 1→12 forward', () => {
    expect(slotsForRound(1, false)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
  })
  it('R2 reverses to 12→1', () => {
    expect(slotsForRound(2, false)).toEqual([12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1])
  })
  it('R3 forward again 1→12', () => {
    expect(slotsForRound(3, false)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
  })
  it('R4 reverse again 12→1', () => {
    expect(slotsForRound(4, false)).toEqual([12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1])
  })
  it('R16 (last round of a 16-round redraft) reverses since round number is even', () => {
    expect(slotsForRound(16, false)).toEqual([12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1])
  })
})

describe('Third-round reversal (3RR) order (12-team, thirdRoundReversal=true)', () => {
  it('R1 runs 1→12 forward (same as standard snake)', () => {
    expect(slotsForRound(1, true)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
  })
  it('R2 reverses to 12→1 (same as standard snake)', () => {
    expect(slotsForRound(2, true)).toEqual([12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1])
  })
  it('R3 reverses AGAIN — slot 1 of round 3 is the team that picked 12th overall', () => {
    // The defining feature of 3RR: the pick-1.12 manager gets the back-to-
    // back 2.01 + 3.01 picks. Slot order in round 3 is 12→1.
    expect(slotsForRound(3, true)).toEqual([12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1])
  })
  it('R4 forward (1→12) — alternation continues from the 3RR-shifted base', () => {
    expect(slotsForRound(4, true)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
  })
  it('R5 reverse (12→1)', () => {
    expect(slotsForRound(5, true)).toEqual([12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1])
  })
})

describe('Convenience helpers wrap the canonical resolver', () => {
  it('getSnakeSlot(1, 1, 12) === 1 and getSnakeSlot(2, 1, 12) === 12', () => {
    expect(getSnakeSlot(1, 1, TEAM_COUNT)).toBe(1)
    expect(getSnakeSlot(2, 1, TEAM_COUNT)).toBe(TEAM_COUNT)
  })
  it('get3RRSlot(3, 1, 12) === 12 (the 3RR shift point)', () => {
    expect(get3RRSlot(3, 1, TEAM_COUNT)).toBe(TEAM_COUNT)
  })
  it('getRoundFromOverall + getPickInRound are inverse of overall', () => {
    for (let overall = 1; overall <= TEAM_COUNT * 16; overall += 1) {
      const round = getRoundFromOverall(overall, TEAM_COUNT)
      const pickInRound = getPickInRound(overall, TEAM_COUNT)
      expect((round - 1) * TEAM_COUNT + pickInRound).toBe(overall)
    }
  })
})

describe('Owner resolution after start/resume', () => {
  // Mirrors how the dashboard reads `currentPick.rosterId` after lifecycle
  // transitions: same fixture, same slot order, same resolver — the
  // commissioner pause/resume loop never moves the owner pointer.
  const slotOrder = Array.from({ length: TEAM_COUNT }, (_, i) => ({
    slot: i + 1,
    rosterId: `team-${i + 1}`,
    displayName: `Manager ${i + 1}`,
  }))

  it('overall=1 resolves to slot-1 manager in standard snake', () => {
    const owner = getManagerForOverallPick(1, slotOrder, 'snake', false, TEAM_COUNT)
    expect(owner?.rosterId).toBe('team-1')
  })

  it('overall=13 (start of R2) resolves to slot-12 in standard snake', () => {
    const owner = getManagerForOverallPick(13, slotOrder, 'snake', false, TEAM_COUNT)
    expect(owner?.rosterId).toBe('team-12')
  })

  it('overall=25 (start of R3) resolves to slot-1 in standard snake but slot-12 with 3RR', () => {
    expect(getManagerForOverallPick(25, slotOrder, 'snake', false, TEAM_COUNT)?.rosterId).toBe(
      'team-1',
    )
    expect(getManagerForOverallPick(25, slotOrder, 'snake', true, TEAM_COUNT)?.rosterId).toBe(
      'team-12',
    )
  })
})

describe('buildBoardMatrix integrity', () => {
  it('produces rounds × teamCount cells with every slot covered every round', () => {
    const cells = buildBoardMatrix(16, TEAM_COUNT, 'snake', true)
    expect(cells.length).toBe(16 * TEAM_COUNT)

    for (let round = 1; round <= 16; round += 1) {
      const roundCells = cells.filter((c) => c.round === round)
      const slots = new Set(roundCells.map((c) => c.slot))
      expect(slots.size).toBe(TEAM_COUNT)
      for (let s = 1; s <= TEAM_COUNT; s += 1) {
        expect(slots.has(s)).toBe(true)
      }
    }
  })
})
