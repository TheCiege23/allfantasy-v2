import { describe, expect, it } from 'vitest'

import { validatePickSubmission } from '@/lib/live-draft-engine/PickValidation'
import { resolveCurrentOnTheClock } from '@/lib/live-draft-engine/CurrentOnTheClockResolver'
import { getSlotInRoundForOverall, getRosterIdForOverall } from '@/lib/live-draft-engine/DraftOrderService'
import type { SlotOrderEntry } from '@/lib/live-draft-engine/types'

function makeSlotOrder(teamCount: number): SlotOrderEntry[] {
  return Array.from({ length: teamCount }, (_, i) => ({
    slot: i + 1,
    rosterId: `roster-${i + 1}`,
    displayName: `Team ${i + 1}`,
  }))
}

describe('Draft Slice C — on-clock enforcement', () => {
  it('on-clock manager can submit', () => {
    const r = validatePickSubmission({
      playerName: 'Jahmyr Gibbs',
      position: 'RB',
      rosterId: 'roster-3',
      currentOnClockRosterId: 'roster-3',
      existingPicks: [],
      sessionStatus: 'in_progress',
    })
    expect(r.valid).toBe(true)
  })

  it('off-clock manager is blocked with a structured error', () => {
    const r = validatePickSubmission({
      playerName: 'Jahmyr Gibbs',
      position: 'RB',
      rosterId: 'roster-9',
      currentOnClockRosterId: 'roster-3',
      existingPicks: [],
      sessionStatus: 'in_progress',
    })
    expect(r.valid).toBe(false)
    expect(r.error).toMatch(/not on the clock/i)
  })

  it('rejects picks while session is not in_progress or paused', () => {
    const r = validatePickSubmission({
      playerName: 'Jahmyr Gibbs',
      position: 'RB',
      rosterId: 'roster-3',
      currentOnClockRosterId: 'roster-3',
      existingPicks: [],
      sessionStatus: 'pre_draft',
    })
    expect(r.valid).toBe(false)
  })
})

describe('Draft Slice C — duplicate player prevention', () => {
  it('blocks the same player twice', () => {
    const r = validatePickSubmission({
      playerName: 'Jahmyr Gibbs',
      position: 'RB',
      rosterId: 'roster-3',
      currentOnClockRosterId: 'roster-3',
      existingPicks: [{ playerName: 'Jahmyr Gibbs', position: 'RB' }],
      sessionStatus: 'in_progress',
    })
    expect(r.valid).toBe(false)
    expect(r.error).toMatch(/already|duplicate/i)
  })

  it('SKIP picks bypass the duplicate check', () => {
    const r = validatePickSubmission({
      playerName: '(Skipped)',
      position: 'SKIP',
      rosterId: 'roster-3',
      currentOnClockRosterId: 'roster-3',
      existingPicks: [{ playerName: '(Skipped)', position: 'SKIP' }],
      sessionStatus: 'in_progress',
    })
    expect(r.valid).toBe(true)
  })
})

describe('Draft Slice C — snake order through 2 rounds', () => {
  const teamCount = 12
  const slotOrder = makeSlotOrder(teamCount)

  it('round 1 is normal order 1..12', () => {
    for (let i = 1; i <= 12; i += 1) {
      const slot = getSlotInRoundForOverall({
        overall: i,
        teamCount,
        draftType: 'snake',
        thirdRoundReversal: false,
      })
      expect(slot).toBe(i)
    }
  })

  it('round 2 reverses to 12..1', () => {
    for (let i = 13; i <= 24; i += 1) {
      const slot = getSlotInRoundForOverall({
        overall: i,
        teamCount,
        draftType: 'snake',
        thirdRoundReversal: false,
      })
      expect(slot).toBe(24 - i + 1)
    }
  })

  it('resolveCurrentOnTheClock advances exactly one pick after each commit (snake)', () => {
    const totalPicks = 24
    let picks: { overall: number; playerName: string; position: string }[] = []
    const seen: number[] = []
    while (picks.length < totalPicks) {
      const cur = resolveCurrentOnTheClock({
        totalPicks,
        picks,
        teamCount,
        draftType: 'snake',
        thirdRoundReversal: false,
        slotOrder,
      })
      if (!cur) break
      seen.push(cur.overall)
      picks = [...picks, { overall: cur.overall, playerName: `P${cur.overall}`, position: 'WR' }]
    }
    expect(seen).toEqual(Array.from({ length: 24 }, (_, i) => i + 1))
  })
})

describe('Draft Slice C — linear order through 2 rounds', () => {
  const teamCount = 10
  it('linear keeps the same direction every round', () => {
    for (let r = 0; r < 2; r += 1) {
      for (let i = 1; i <= teamCount; i += 1) {
        const overall = r * teamCount + i
        const slot = getSlotInRoundForOverall({
          overall,
          teamCount,
          draftType: 'linear',
          thirdRoundReversal: false,
        })
        expect(slot).toBe(i)
      }
    }
  })
})

describe('Draft Slice C — third-round reversal', () => {
  const teamCount = 12
  it('R1 fwd, R2 reverse, R3 reverse, R4 fwd, R5 reverse', () => {
    expect(getSlotInRoundForOverall({ overall: 1, teamCount, draftType: 'snake', thirdRoundReversal: true })).toBe(1)
    expect(getSlotInRoundForOverall({ overall: 12, teamCount, draftType: 'snake', thirdRoundReversal: true })).toBe(12)
    expect(getSlotInRoundForOverall({ overall: 13, teamCount, draftType: 'snake', thirdRoundReversal: true })).toBe(12)
    expect(getSlotInRoundForOverall({ overall: 24, teamCount, draftType: 'snake', thirdRoundReversal: true })).toBe(1)
    expect(getSlotInRoundForOverall({ overall: 25, teamCount, draftType: 'snake', thirdRoundReversal: true })).toBe(12)
    expect(getSlotInRoundForOverall({ overall: 36, teamCount, draftType: 'snake', thirdRoundReversal: true })).toBe(1)
    expect(getSlotInRoundForOverall({ overall: 37, teamCount, draftType: 'snake', thirdRoundReversal: true })).toBe(1)
    expect(getSlotInRoundForOverall({ overall: 48, teamCount, draftType: 'snake', thirdRoundReversal: true })).toBe(12)
    expect(getSlotInRoundForOverall({ overall: 49, teamCount, draftType: 'snake', thirdRoundReversal: true })).toBe(12)
    expect(getSlotInRoundForOverall({ overall: 60, teamCount, draftType: 'snake', thirdRoundReversal: true })).toBe(1)
  })

  it('third-round reversal correctly maps back to slotOrder rosterIds', () => {
    const slotOrder = makeSlotOrder(teamCount)
    const owner3of1 = getRosterIdForOverall(13, teamCount, 'snake', true, slotOrder)
    expect(owner3of1?.rosterId).toBe('roster-12')
    const owner3of12 = getRosterIdForOverall(24, teamCount, 'snake', true, slotOrder)
    expect(owner3of12?.rosterId).toBe('roster-1')
  })
})

describe('Draft Slice C — placeholder roster guard (unit-level shape)', () => {
  it('placeholder rosterIds are easy to detect at the boundary', () => {
    const ids = ['placeholder-1', 'placeholder-12', 'roster-3', 'cuid-abc']
    expect(ids.filter((id) => id.startsWith('placeholder-'))).toEqual(['placeholder-1', 'placeholder-12'])
  })
})
