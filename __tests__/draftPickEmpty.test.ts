// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { resolveCurrentOnTheClock } from '@/lib/live-draft-engine/CurrentOnTheClockResolver'
import {
  isDraftBoardFull,
  isDraftPickRowEmpty,
  isDraftPickRowEmptyFromSnapshot,
  resolveNextOpenPickOverall,
} from '@/lib/live-draft-engine/draftPickEmpty'

describe('draftPickEmpty', () => {
  it('detects commissioner-cleared rows', () => {
    expect(
      isDraftPickRowEmpty({
        playerName: '',
        position: 'EMPTY',
        pickMetadata: { pickEditorEmpty: true },
      }),
    ).toBe(true)
    expect(isDraftPickRowEmpty({ playerName: 'X', position: 'RB', pickMetadata: null })).toBe(false)
  })

  it('isDraftPickRowEmptyFromSnapshot treats pickEditorEmpty flag as empty', () => {
    expect(
      isDraftPickRowEmptyFromSnapshot({
        playerName: 'stale',
        position: 'RB',
        pickMetadata: null,
        pickEditorEmpty: true,
      }),
    ).toBe(true)
    expect(
      isDraftPickRowEmptyFromSnapshot({
        playerName: 'X',
        position: 'WR',
        pickMetadata: null,
        pickEditorEmpty: false,
      }),
    ).toBe(false)
  })

  it('resolveNextOpenPickOverall finds first hole or empty', () => {
    const total = 4
    const picks = [
      { overall: 1, playerName: 'A', position: 'QB', pickMetadata: null },
      { overall: 2, playerName: '', position: 'EMPTY', pickMetadata: { pickEditorEmpty: true } },
      { overall: 3, playerName: 'C', position: 'WR', pickMetadata: null },
    ]
    expect(resolveNextOpenPickOverall(picks, total)).toBe(2)
    expect(isDraftBoardFull(picks, total)).toBe(false)
  })

  it('isDraftBoardFull when every slot filled', () => {
    const total = 2
    const picks = [
      { overall: 1, playerName: 'A', position: 'QB', pickMetadata: null },
      { overall: 2, playerName: 'B', position: 'RB', pickMetadata: null },
    ]
    expect(isDraftBoardFull(picks, total)).toBe(true)
  })

  it('resolveCurrentOnTheClock targets first cleared middle (submitPick contract)', () => {
    const slotOrder = [
      { slot: 1, rosterId: 'r1', displayName: 'A' },
      { slot: 2, rosterId: 'r2', displayName: 'B' },
    ]
    const picks = [
      { overall: 1, playerName: 'P1', position: 'QB', pickMetadata: null },
      { overall: 2, playerName: '', position: 'EMPTY', pickMetadata: { pickEditorEmpty: true } },
      { overall: 3, playerName: 'P3', position: 'RB', pickMetadata: null },
    ]
    const totalPicks = 30
    expect(resolveNextOpenPickOverall(picks, totalPicks)).toBe(2)

    const current = resolveCurrentOnTheClock({
      totalPicks,
      picks,
      teamCount: 2,
      draftType: 'snake',
      thirdRoundReversal: false,
      slotOrder,
    })
    expect(current).not.toBeNull()
    expect(current!.overall).toBe(2)
    expect(current!.round).toBe(1)
    expect(current!.slot).toBe(2)
  })
})
