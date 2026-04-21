import { describe, expect, it } from 'vitest'
import {
  get3RRSlot,
  buildBoardMatrix,
  getManagerForOverallPick,
  getNextTeamsOnDeck,
  getPickIndexInRound,
  getRoundFromOverall,
  getSnakeSlot,
  getSlotInRoundForOverall,
  getTimerRemaining,
  isDraftComplete,
  canUserDraft,
} from '@/lib/draft/draftOrder'

function managers12() {
  return Array.from({ length: 12 }, (_, i) => ({
    slot: i + 1,
    rosterId: `r${i + 1}`,
    displayName: `T${i + 1}`,
  }))
}

describe('draftOrder', () => {
  it('snake order 12-team: round 1 forward, round 2 reverse', () => {
    expect(getSlotInRoundForOverall({ overall: 1, teamCount: 12, draftType: 'snake', thirdRoundReversal: false })).toBe(1)
    expect(getSlotInRoundForOverall({ overall: 12, teamCount: 12, draftType: 'snake', thirdRoundReversal: false })).toBe(12)
    expect(getSlotInRoundForOverall({ overall: 13, teamCount: 12, draftType: 'snake', thirdRoundReversal: false })).toBe(12)
    expect(getSlotInRoundForOverall({ overall: 24, teamCount: 12, draftType: 'snake', thirdRoundReversal: false })).toBe(1)
  })

  it('snake 8 and 10 teams: alternating rounds', () => {
    for (const n of [8, 10]) {
      const r2p1 = getSlotInRoundForOverall({ overall: n + 1, teamCount: n, draftType: 'snake', thirdRoundReversal: false })
      expect(r2p1).toBe(n)
      const r3p1 = getSlotInRoundForOverall({ overall: 2 * n + 1, teamCount: n, draftType: 'snake', thirdRoundReversal: false })
      expect(r3p1).toBe(1)
    }
  })

  it('linear: slot follows pick index in round only', () => {
    expect(getSlotInRoundForOverall({ overall: 15, teamCount: 12, draftType: 'linear', thirdRoundReversal: false })).toBe(3)
  })

  it('3RR: rounds 2–3 snake “backward”; round 3 pick 1 starts at slot N', () => {
    const tc = 12
    const r2 = getSlotInRoundForOverall({ overall: 13, teamCount: tc, draftType: 'snake', thirdRoundReversal: true })
    expect(r2).toBe(12)
    const r3first = getSlotInRoundForOverall({ overall: 25, teamCount: tc, draftType: 'snake', thirdRoundReversal: true })
    expect(r3first).toBe(12)
  })

  it('getRoundFromOverall / getPickIndexInRound', () => {
    expect(getRoundFromOverall(15, 12)).toBe(2)
    expect(getPickIndexInRound(15, 12)).toBe(3)
  })

  it('getSnakeSlot matches overall-derived slot', () => {
    const tc = 12
    const overall = 17
    const round = getRoundFromOverall(overall, tc)
    const idx = getPickIndexInRound(overall, tc)
    expect(getSnakeSlot(round, idx, tc)).toBe(
      getSlotInRoundForOverall({ overall, teamCount: tc, draftType: 'snake', thirdRoundReversal: false }),
    )
  })

  it('get3RRSlot matches overall-derived slot when 3RR', () => {
    const tc = 12
    const overall = 30
    const round = getRoundFromOverall(overall, tc)
    const idx = getPickIndexInRound(overall, tc)
    expect(get3RRSlot(round, idx, tc)).toBe(
      getSlotInRoundForOverall({ overall, teamCount: tc, draftType: 'snake', thirdRoundReversal: true }),
    )
  })

  it('getManagerForOverallPick resolves roster from slot order', () => {
    const m = managers12()
    const a = getManagerForOverallPick(1, m, 'snake', false, 12)
    expect(a?.rosterId).toBe('r1')
    const b = getManagerForOverallPick(13, m, 'snake', false, 12)
    expect(b?.rosterId).toBe('r12')
  })

  it('canUserDraft', () => {
    expect(canUserDraft(true, false, true)).toBe(true)
    expect(canUserDraft(true, false, false)).toBe(false)
    expect(canUserDraft(false, false, true)).toBe(false)
    expect(canUserDraft(true, true, true)).toBe(false)
  })

  it('isDraftComplete', () => {
    expect(isDraftComplete(96, 96)).toBe(true)
    expect(isDraftComplete(95, 96)).toBe(false)
    expect(isDraftComplete(0, 0)).toBe(false)
  })

  it('getTimerRemaining uses timerEndAt - now', () => {
    const end = new Date('2026-06-01T12:00:30.000Z').toISOString()
    expect(getTimerRemaining(end, new Date('2026-06-01T12:00:00.000Z').getTime())).toBe(30)
    expect(getTimerRemaining(end, new Date('2026-06-01T12:00:31.000Z').getTime())).toBe(0)
  })

  it('buildBoardMatrix length matches rounds * teams', () => {
    const m = buildBoardMatrix(3, 12, 'snake', false)
    expect(m.length).toBe(36)
    expect(m[0]?.overall).toBe(1)
    expect(m[0]?.slot).toBe(1)
    expect(m[11]?.slot).toBe(12)
    expect(m[12]?.slot).toBe(12)
  })

  it('getNextTeamsOnDeck returns next slots after nextOverall', () => {
    const slotOrder = managers12()
    const total = 12 * 12
    const next = getNextTeamsOnDeck({
      nextOverall: 2,
      count: 3,
      teamCount: 12,
      draftType: 'snake',
      thirdRoundReversal: false,
      slotOrder,
      totalPicks: total,
    })
    expect(next.length).toBe(3)
    expect(next[0]?.slot).toBe(2)
  })
})
