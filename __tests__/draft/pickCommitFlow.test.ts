import { describe, expect, it } from 'vitest'
import {
  advanceDraftRoomCoreStateAfterPick,
  buildCommitPickPayload,
  computeTimerEndAtIso,
  isPickCommitAllowed,
  isPickCommitAllowedByName,
  PickCommitLock,
} from '@/lib/live-draft-engine/pickCommitFlow'
import { createStartedDraftRoomState } from '@/lib/live-draft-engine/draftRoomCoreState'
import type { DraftRoomPick } from '@/lib/live-draft-engine/types'

const slotOrder = [
  { slot: 1, rosterId: 'r1', displayName: 'T1' },
  { slot: 2, rosterId: 'r2', displayName: 'T2' },
]

function samplePick(overrides: Partial<DraftRoomPick>): DraftRoomPick {
  return {
    id: 'pick-1',
    overall: 1,
    round: 1,
    slot: 1,
    rosterId: 'r1',
    displayName: 'T1',
    playerName: 'Player A',
    position: 'RB',
    team: 'BUF',
    byeWeek: null,
    playerId: 'p1',
    tradedPickMeta: null,
    source: 'user',
    pickLabel: '1.01',
    createdAt: '2026-01-01T12:00:00.000Z',
    ...overrides,
  }
}

describe('isPickCommitAllowed', () => {
  it('returns false when !canDraft', () => {
    expect(
      isPickCommitAllowed({
        canDraft: false,
        playerId: 'x',
        draftedPlayerIds: new Set(),
      }),
    ).toBe(false)
  })

  it('returns false when player already drafted', () => {
    expect(
      isPickCommitAllowed({
        canDraft: true,
        playerId: 'p1',
        draftedPlayerIds: new Set(['p1']),
      }),
    ).toBe(false)
  })

  it('returns true when allowed', () => {
    expect(
      isPickCommitAllowed({
        canDraft: true,
        playerId: 'p2',
        draftedPlayerIds: new Set(['p1']),
      }),
    ).toBe(true)
  })
})

describe('isPickCommitAllowedByName', () => {
  it('blocks drafted name', () => {
    expect(
      isPickCommitAllowedByName({
        canDraft: true,
        playerName: 'Foo',
        draftedNames: new Set(['foo']),
      }),
    ).toBe(false)
  })
})

describe('advanceDraftRoomCoreStateAfterPick', () => {
  it('advances overall, recomputes on-clock team, resets timer', () => {
    const base = createStartedDraftRoomState({
      managers: [{ rosterId: 'r1' }, { rosterId: 'r2' }],
      pickTimeSeconds: 90,
      now: new Date('2026-01-01T12:00:00.000Z'),
    })

    const commit = buildCommitPickPayload({
      playerId: 'p1',
      teamId: 'r1',
      overall: 1,
      round: 1,
      slot: 1,
      at: new Date('2026-01-01T12:00:05.000Z'),
    })

    const next = advanceDraftRoomCoreStateAfterPick({
      state: base,
      commit,
      newPick: samplePick({}),
      rounds: 2,
      teamCount: 2,
      draftType: 'snake',
      thirdRoundReversal: false,
      slotOrder,
      pickTimeSeconds: 90,
      now: new Date('2026-01-01T12:00:05.000Z'),
    })

    expect(next.currentOverall).toBe(2)
    expect(next.currentTeamId).toBe('r2')
    expect(next.picks).toHaveLength(1)
    expect(next.timerEndAt).toBe(computeTimerEndAtIso(90, new Date('2026-01-01T12:00:05.000Z')))
  })

  it('throws on overall mismatch', () => {
    const base = createStartedDraftRoomState({
      managers: [{ id: 'r1' }],
      pickTimeSeconds: 60,
    })
    expect(() =>
      advanceDraftRoomCoreStateAfterPick({
        state: base,
        commit: buildCommitPickPayload({
          playerId: 'p',
          teamId: 'r1',
          overall: 2,
          round: 1,
          slot: 1,
        }),
        newPick: samplePick({ overall: 2 }),
        rounds: 5,
        teamCount: 2,
        draftType: 'snake',
        thirdRoundReversal: false,
        slotOrder,
        pickTimeSeconds: 60,
      }),
    ).toThrow(/currentOverall/)
  })

  it('completes draft on last pick', () => {
    const singleSlot = [{ slot: 1, rosterId: 'r1', displayName: 'T1' }]
    const state = createStartedDraftRoomState({
      managers: [{ rosterId: 'r1' }],
      pickTimeSeconds: 60,
    })
    const finished = advanceDraftRoomCoreStateAfterPick({
      state,
      commit: buildCommitPickPayload({
        playerId: 'p1',
        teamId: 'r1',
        overall: 1,
        round: 1,
        slot: 1,
      }),
      newPick: samplePick({}),
      rounds: 1,
      teamCount: 1,
      draftType: 'snake',
      thirdRoundReversal: false,
      slotOrder: singleSlot,
      pickTimeSeconds: 60,
    })
    expect(finished.currentOverall).toBe(0)
    expect(finished.timerEndAt).toBe('')
    expect(finished.picks).toHaveLength(1)
  })
})

describe('PickCommitLock', () => {
  it('serializes tryAcquire', () => {
    const lock = new PickCommitLock()
    expect(lock.tryAcquire()).toBe(true)
    expect(lock.tryAcquire()).toBe(false)
    lock.release()
    expect(lock.tryAcquire()).toBe(true)
  })
})
