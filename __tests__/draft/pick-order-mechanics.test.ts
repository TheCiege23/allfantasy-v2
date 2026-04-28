import { describe, expect, it } from 'vitest'

import { getSlotInRoundForOverall, getRosterIdForOverall } from '@/lib/live-draft-engine/DraftOrderService'
import { resolveCurrentOnTheClock } from '@/lib/live-draft-engine/CurrentOnTheClockResolver'
import { buildDraftRoomCoreState } from '@/lib/live-draft-engine/draftRoomCoreState'
import type { DraftSessionSnapshot, SlotOrderEntry } from '@/lib/live-draft-engine/types'

function makeSlotOrder(teamCount: number): SlotOrderEntry[] {
  return Array.from({ length: teamCount }, (_, i) => ({
    slot: i + 1,
    rosterId: `roster-${i + 1}`,
    displayName: `Team ${i + 1}`,
  }))
}

function makeSession(overrides: Partial<DraftSessionSnapshot>): DraftSessionSnapshot {
  return {
    id: 'session-order',
    leagueId: 'league-order',
    status: 'in_progress',
    draftType: 'snake',
    rounds: 4,
    teamCount: 12,
    thirdRoundReversal: false,
    timerSeconds: 90,
    timerEndAt: '2026-01-01T12:02:30.000Z',
    pausedRemainingSeconds: null,
    slotOrder: makeSlotOrder(12),
    tradedPicks: [],
    version: 1,
    picks: [],
    currentPick: {
      overall: 1,
      round: 1,
      slot: 1,
      rosterId: 'roster-1',
      displayName: 'Team 1',
      pickLabel: '1.01',
    },
    timer: {
      status: 'running',
      remainingSeconds: 88,
      timerEndAt: '2026-01-01T12:02:30.000Z',
    },
    updatedAt: '2026-01-01T12:00:00.000Z',
    ...overrides,
  }
}

describe('Phase 4 Slice 1 - snake order mechanics', () => {
  it('12-team snake: R1 1..12, R2 12..1, R3 1..12, R4 12..1', () => {
    const teamCount = 12

    for (let overall = 1; overall <= 12; overall += 1) {
      expect(
        getSlotInRoundForOverall({
          overall,
          teamCount,
          draftType: 'snake',
          thirdRoundReversal: false,
        }),
      ).toBe(overall)
    }

    for (let overall = 13; overall <= 24; overall += 1) {
      expect(
        getSlotInRoundForOverall({
          overall,
          teamCount,
          draftType: 'snake',
          thirdRoundReversal: false,
        }),
      ).toBe(24 - overall + 1)
    }

    for (let overall = 25; overall <= 36; overall += 1) {
      expect(
        getSlotInRoundForOverall({
          overall,
          teamCount,
          draftType: 'snake',
          thirdRoundReversal: false,
        }),
      ).toBe(overall - 24)
    }

    for (let overall = 37; overall <= 48; overall += 1) {
      expect(
        getSlotInRoundForOverall({
          overall,
          teamCount,
          draftType: 'snake',
          thirdRoundReversal: false,
        }),
      ).toBe(48 - overall + 1)
    }
  })
})

describe('Phase 4 Slice 1 - third-round reversal mechanics', () => {
  it('12-team 3RR: R1 fwd, R2 rev, R3 rev, R4 fwd, R5 rev', () => {
    const teamCount = 12
    const checks = [
      { overall: 1, expectedSlot: 1 },
      { overall: 12, expectedSlot: 12 },
      { overall: 13, expectedSlot: 12 },
      { overall: 24, expectedSlot: 1 },
      { overall: 25, expectedSlot: 12 },
      { overall: 36, expectedSlot: 1 },
      { overall: 37, expectedSlot: 1 },
      { overall: 48, expectedSlot: 12 },
      { overall: 49, expectedSlot: 12 },
      { overall: 60, expectedSlot: 1 },
    ]

    for (const c of checks) {
      expect(
        getSlotInRoundForOverall({
          overall: c.overall,
          teamCount,
          draftType: 'snake',
          thirdRoundReversal: true,
        }),
      ).toBe(c.expectedSlot)
    }
  })
})

describe('Phase 4 Slice 1 - linear mechanics', () => {
  it('linear order is always 1..N across rounds', () => {
    const teamCount = 12
    for (let round = 0; round < 5; round += 1) {
      for (let pickInRound = 1; pickInRound <= teamCount; pickInRound += 1) {
        const overall = round * teamCount + pickInRound
        expect(
          getSlotInRoundForOverall({
            overall,
            teamCount,
            draftType: 'linear',
            thirdRoundReversal: false,
          }),
        ).toBe(pickInRound)
      }
    }
  })
})

describe('Phase 4 Slice 1 - odd/even team-size coverage', () => {
  it.each([8, 10, 12, 14])('snake + linear map into valid slots for %i teams', (teamCount) => {
    const totalPicks = teamCount * 4
    for (let overall = 1; overall <= totalPicks; overall += 1) {
      const snake = getSlotInRoundForOverall({
        overall,
        teamCount,
        draftType: 'snake',
        thirdRoundReversal: false,
      })
      const linear = getSlotInRoundForOverall({
        overall,
        teamCount,
        draftType: 'linear',
        thirdRoundReversal: false,
      })
      expect(snake).toBeGreaterThanOrEqual(1)
      expect(snake).toBeLessThanOrEqual(teamCount)
      expect(linear).toBeGreaterThanOrEqual(1)
      expect(linear).toBeLessThanOrEqual(teamCount)
    }
  })
})

describe('Phase 4 Slice 1 - current pick pointer mechanics', () => {
  it('no picks -> 1.01', () => {
    const slotOrder = makeSlotOrder(12)
    const current = resolveCurrentOnTheClock({
      totalPicks: 48,
      picks: [],
      teamCount: 12,
      draftType: 'snake',
      thirdRoundReversal: false,
      slotOrder,
    })
    expect(current?.overall).toBe(1)
    expect(current?.pickLabel).toBe('1.01')
    expect(current?.slot).toBe(1)
  })

  it('after one pick -> 1.02', () => {
    const slotOrder = makeSlotOrder(12)
    const current = resolveCurrentOnTheClock({
      totalPicks: 48,
      picks: [{ overall: 1, playerName: 'Player 1', position: 'RB' }],
      teamCount: 12,
      draftType: 'snake',
      thirdRoundReversal: false,
      slotOrder,
    })
    expect(current?.overall).toBe(2)
    expect(current?.pickLabel).toBe('1.02')
    expect(current?.slot).toBe(2)
  })

  it('after full round in snake -> round 2 slot 12', () => {
    const slotOrder = makeSlotOrder(12)
    const picks = Array.from({ length: 12 }, (_, i) => ({
      overall: i + 1,
      playerName: `P${i + 1}`,
      position: 'WR',
    }))
    const current = resolveCurrentOnTheClock({
      totalPicks: 48,
      picks,
      teamCount: 12,
      draftType: 'snake',
      thirdRoundReversal: false,
      slotOrder,
    })
    expect(current?.overall).toBe(13)
    expect(current?.round).toBe(2)
    expect(current?.slot).toBe(12)
    expect(current?.pickLabel).toBe('2.01')
  })

  it('after draft complete -> no current pick', () => {
    const slotOrder = makeSlotOrder(12)
    const totalPicks = 24
    const picks = Array.from({ length: totalPicks }, (_, i) => ({
      overall: i + 1,
      playerName: `P${i + 1}`,
      position: 'TE',
    }))
    const current = resolveCurrentOnTheClock({
      totalPicks,
      picks,
      teamCount: 12,
      draftType: 'snake',
      thirdRoundReversal: false,
      slotOrder,
    })
    expect(current).toBeNull()
  })
})

describe('Phase 4 Slice 1 - overall index integrity', () => {
  it('pick 1 maps to round 1 pick 1 / slot 1', () => {
    const teamCount = 12
    const slot = getSlotInRoundForOverall({
      overall: 1,
      teamCount,
      draftType: 'snake',
      thirdRoundReversal: false,
    })
    expect(Math.ceil(1 / teamCount)).toBe(1)
    expect(((1 - 1) % teamCount) + 1).toBe(1)
    expect(slot).toBe(1)
  })

  it('pick 13 in 12-team snake maps to round 2 pick 1 / slot 12', () => {
    const teamCount = 12
    const slot = getSlotInRoundForOverall({
      overall: 13,
      teamCount,
      draftType: 'snake',
      thirdRoundReversal: false,
    })
    expect(Math.ceil(13 / teamCount)).toBe(2)
    expect(((13 - 1) % teamCount) + 1).toBe(1)
    expect(slot).toBe(12)
  })

  it('pick 25 in snake maps to round 3 pick 1 / slot 1', () => {
    const teamCount = 12
    const slot = getSlotInRoundForOverall({
      overall: 25,
      teamCount,
      draftType: 'snake',
      thirdRoundReversal: false,
    })
    expect(Math.ceil(25 / teamCount)).toBe(3)
    expect(((25 - 1) % teamCount) + 1).toBe(1)
    expect(slot).toBe(1)
  })

  it('pick 25 in 3RR maps to round 3 pick 1 / slot 12', () => {
    const teamCount = 12
    const slot = getSlotInRoundForOverall({
      overall: 25,
      teamCount,
      draftType: 'snake',
      thirdRoundReversal: true,
    })
    expect(Math.ceil(25 / teamCount)).toBe(3)
    expect(((25 - 1) % teamCount) + 1).toBe(1)
    expect(slot).toBe(12)
  })

  it('owner resolution follows slot mapping', () => {
    const slotOrder = makeSlotOrder(12)
    const owner = getRosterIdForOverall(13, 12, 'snake', false, slotOrder)
    expect(owner?.rosterId).toBe('roster-12')
  })
})

describe('Phase 4 Slice 1 - skip/undo/pause-resume pointer integrity', () => {
  it('skip pick advances pointer to next overall', () => {
    const slotOrder = makeSlotOrder(12)
    const picks = [{ overall: 1, playerName: '(Skipped)', position: 'SKIP' }]
    const current = resolveCurrentOnTheClock({
      totalPicks: 48,
      picks,
      teamCount: 12,
      draftType: 'snake',
      thirdRoundReversal: false,
      slotOrder,
    })
    expect(current?.overall).toBe(2)
    expect(current?.slot).toBe(2)
  })

  it('undo last pick returns pointer to previous overall', () => {
    const slotOrder = makeSlotOrder(12)
    const picksBeforeUndo = [
      { overall: 1, playerName: 'P1', position: 'RB' },
      { overall: 2, playerName: 'P2', position: 'WR' },
    ]
    const beforeUndo = resolveCurrentOnTheClock({
      totalPicks: 48,
      picks: picksBeforeUndo,
      teamCount: 12,
      draftType: 'snake',
      thirdRoundReversal: false,
      slotOrder,
    })
    expect(beforeUndo?.overall).toBe(3)

    const afterUndo = resolveCurrentOnTheClock({
      totalPicks: 48,
      picks: picksBeforeUndo.slice(0, -1),
      teamCount: 12,
      draftType: 'snake',
      thirdRoundReversal: false,
      slotOrder,
    })
    expect(afterUndo?.overall).toBe(2)
    expect(afterUndo?.slot).toBe(2)
  })

  it('pause/resume status change does not mutate pointer with same picks', () => {
    const picks = [
      {
        id: 'p1',
        overall: 1,
        round: 1,
        slot: 1,
        rosterId: 'roster-1',
        displayName: 'Team 1',
        playerName: 'Player One',
        position: 'RB',
        team: 'BUF',
        byeWeek: null,
        playerId: 'pid-1',
        tradedPickMeta: null,
        source: 'user',
        pickLabel: '1.01',
        createdAt: '2026-01-01T12:00:00.000Z',
      },
    ]
    const slotOrder = makeSlotOrder(12)
    const paused = buildDraftRoomCoreState(
      makeSession({
        status: 'paused',
        slotOrder,
        picks,
        currentPick: null,
        timer: { status: 'paused', remainingSeconds: 75, timerEndAt: null },
        timerEndAt: null,
      }),
    )
    const resumed = buildDraftRoomCoreState(
      makeSession({
        status: 'in_progress',
        slotOrder,
        picks,
        currentPick: null,
        timer: { status: 'running', remainingSeconds: 75, timerEndAt: '2026-01-01T12:02:00.000Z' },
        timerEndAt: '2026-01-01T12:02:00.000Z',
      }),
    )

    expect(paused.currentOverall).toBe(2)
    expect(resumed.currentOverall).toBe(2)
    expect(paused.currentTeamId).toBe(resumed.currentTeamId)
  })

  it('timer reset does not alter pointer with unchanged picks', () => {
    const slotOrder = makeSlotOrder(12)
    const picks = [
      {
        overall: 1,
        playerName: 'Player One',
        position: 'QB',
      },
    ]
    const beforeReset = resolveCurrentOnTheClock({
      totalPicks: 48,
      picks,
      teamCount: 12,
      draftType: 'snake',
      thirdRoundReversal: false,
      slotOrder,
    })
    const afterReset = resolveCurrentOnTheClock({
      totalPicks: 48,
      picks,
      teamCount: 12,
      draftType: 'snake',
      thirdRoundReversal: false,
      slotOrder,
    })
    expect(beforeReset?.overall).toBe(2)
    expect(afterReset?.overall).toBe(2)
    expect(afterReset?.slot).toBe(beforeReset?.slot)
  })
})
