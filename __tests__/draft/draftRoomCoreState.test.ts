import { describe, expect, it } from 'vitest'
import {
  buildDraftRoomCoreState,
  createStartedDraftRoomState,
  resolveFirstManagerTeamId,
} from '@/lib/live-draft-engine/draftRoomCoreState'
import type { DraftSessionSnapshot } from '@/lib/live-draft-engine/types'

function baseSession(overrides: Partial<DraftSessionSnapshot>): DraftSessionSnapshot {
  return {
    id: 's1',
    leagueId: 'l1',
    status: 'in_progress',
    draftType: 'snake',
    rounds: 15,
    teamCount: 12,
    thirdRoundReversal: false,
    timerSeconds: 90,
    timerEndAt: '2026-01-01T12:02:30.000Z',
    pausedRemainingSeconds: null,
    slotOrder: [
      { slot: 1, rosterId: 'r1', displayName: 'A' },
      { slot: 2, rosterId: 'r2', displayName: 'B' },
    ],
    tradedPicks: [],
    version: 1,
    picks: [],
    currentPick: {
      overall: 1,
      round: 1,
      slot: 1,
      rosterId: 'r1',
      displayName: 'A',
      pickLabel: '1.01',
    },
    timer: {
      status: 'running',
      remainingSeconds: 88,
      timerEndAt: '2026-01-01T12:02:30.000Z',
    },
    updatedAt: '2026-01-01T12:00:00.000Z',
    ...overrides,
  } as DraftSessionSnapshot
}

describe('buildDraftRoomCoreState', () => {
  it('maps in-progress session', () => {
    const s = buildDraftRoomCoreState(baseSession({}))
    expect(s.draftStarted).toBe(true)
    expect(s.currentOverall).toBe(1)
    expect(s.currentRound).toBe(1)
    expect(s.currentPickInRound).toBe(1)
    expect(s.currentTeamId).toBe('r1')
    expect(s.timerEndAt).toContain('2026-01-01')
    expect(s.picks).toEqual([])
  })

  it('pre_draft: not started, first slot on clock', () => {
    const s = buildDraftRoomCoreState(
      baseSession({
        status: 'pre_draft',
        currentPick: null as any,
        timer: { status: 'none', remainingSeconds: null, timerEndAt: null },
        timerEndAt: null,
      }),
    )
    expect(s.draftStarted).toBe(false)
    expect(s.currentTeamId).toBe('r1')
    expect(s.timerEndAt).toBe('')
  })

  it('completed: zeros when no current pick', () => {
    const s = buildDraftRoomCoreState(
      baseSession({
        status: 'completed',
        currentPick: null as any,
        picks: [
          {
            id: 'p1',
            overall: 1,
            round: 1,
            slot: 1,
            rosterId: 'r1',
            displayName: 'A',
            playerName: 'X',
            position: 'RB',
            team: 'BUF',
            byeWeek: null,
            playerId: null,
            tradedPickMeta: null,
            source: 'user',
            pickLabel: '1.01',
            createdAt: '2026-01-01T12:00:00.000Z',
          },
        ],
      }),
    )
    expect(s.draftStarted).toBe(true)
    expect(s.currentOverall).toBe(0)
    expect(s.picks).toHaveLength(1)
  })
})

describe('createStartedDraftRoomState', () => {
  it('matches start-draft shape: team id + timer = now + pickTime', () => {
    const anchor = new Date('2026-06-01T12:00:00.000Z')
    const managers = [{ id: 'team-a' }, { id: 'team-b' }]
    const s = createStartedDraftRoomState({
      managers,
      pickTimeSeconds: 90,
      now: anchor,
    })
    expect(s).toEqual({
      draftStarted: true,
      currentOverall: 1,
      currentRound: 1,
      currentPickInRound: 1,
      currentTeamId: 'team-a',
      timerEndAt: new Date(anchor.getTime() + 90_000).toISOString(),
      picks: [],
    })
  })

  it('uses rosterId when id is missing', () => {
    const s = createStartedDraftRoomState({
      managers: [{ rosterId: 'r-1' }],
      pickTimeSeconds: 60,
      now: new Date('2026-01-01T00:00:00.000Z'),
    })
    expect(s.currentTeamId).toBe('r-1')
  })
})

describe('resolveFirstManagerTeamId', () => {
  it('returns empty when no managers', () => {
    expect(resolveFirstManagerTeamId([])).toBe('')
    expect(resolveFirstManagerTeamId(undefined)).toBe('')
  })
})
