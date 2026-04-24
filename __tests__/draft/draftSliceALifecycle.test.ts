import { describe, expect, it } from 'vitest'

import { mergeDraftSessionSnapshot } from '@/lib/draft-room/mergeDraftSessionSnapshot'
import type { DraftSessionSnapshot } from '@/lib/live-draft-engine/types'

const slotOrder = [
  { slot: 1, rosterId: 'r-a', displayName: 'Alpha FC' },
  { slot: 2, rosterId: 'r-b', displayName: 'Beta United' },
]

const timerNone = { status: 'none' as const, remainingSeconds: null as number | null, timerEndAt: null as string | null }

function basePreDraft(): DraftSessionSnapshot {
  return {
    id: 'd1',
    leagueId: 'l1',
    status: 'pre_draft',
    draftType: 'snake',
    rounds: 2,
    teamCount: 2,
    thirdRoundReversal: false,
    timerSeconds: 90,
    timerEndAt: null,
    pausedRemainingSeconds: null,
    slotOrder,
    tradedPicks: [],
    version: 1,
    picks: [],
    currentPick: null,
    timer: timerNone,
    updatedAt: '2026-01-01T11:00:00.000Z',
  }
}

describe('Draft Slice A — session merge / single-board authority', () => {
  it('applies start (pre_draft → in_progress) from POST snapshot without losing slotOrder', () => {
    const pre = basePreDraft()
    const started: DraftSessionSnapshot = {
      ...pre,
      status: 'in_progress',
      version: 2,
      currentPick: {
        overall: 1,
        round: 1,
        slot: 1,
        rosterId: 'r-a',
        displayName: 'Alpha FC',
        pickLabel: '1.01',
      },
      timer: {
        status: 'running',
        remainingSeconds: 90,
        timerEndAt: '2026-01-01T12:01:30.000Z',
      },
      timerEndAt: '2026-01-01T12:01:30.000Z',
      updatedAt: '2026-01-01T11:00:01.000Z',
    }
    const merged = mergeDraftSessionSnapshot(pre, started)
    expect(merged?.status).toBe('in_progress')
    expect(merged?.currentPick?.rosterId).toBe('r-a')
    expect(merged?.currentPick?.overall).toBe(1)
    expect(merged?.slotOrder).toEqual(slotOrder)
    expect(merged?.version).toBe(2)
  })

  it('pause keeps the same on-clock pick (overall) as in_progress', () => {
    const live = mergeDraftSessionSnapshot(
      null,
      {
        ...basePreDraft(),
        status: 'in_progress',
        version: 2,
        currentPick: {
          overall: 3,
          round: 2,
          slot: 1,
          rosterId: 'r-a',
          displayName: 'Alpha FC',
          pickLabel: '2.01',
        },
        picks: [
          {
            id: 'p1',
            overall: 1,
            round: 1,
            slot: 1,
            rosterId: 'r-a',
            displayName: 'Alpha FC',
            playerName: 'A',
            position: 'RB',
            team: 'BUF',
            byeWeek: null,
            playerId: 'x1',
            tradedPickMeta: null,
            source: 'user',
            pickLabel: '1.01',
            createdAt: '2026-01-01T11:00:00.000Z',
          },
          {
            id: 'p2',
            overall: 2,
            round: 1,
            slot: 2,
            rosterId: 'r-b',
            displayName: 'Beta United',
            playerName: 'B',
            position: 'WR',
            team: 'DAL',
            byeWeek: null,
            playerId: 'x2',
            tradedPickMeta: null,
            source: 'user',
            pickLabel: '1.02',
            createdAt: '2026-01-01T11:00:05.000Z',
          },
        ],
        timer: { status: 'running', remainingSeconds: 40, timerEndAt: '2026-01-01T12:05:00.000Z' },
        timerEndAt: '2026-01-01T12:05:00.000Z',
        updatedAt: '2026-01-01T11:01:00.000Z',
      } as DraftSessionSnapshot,
    )!

    const paused: DraftSessionSnapshot = {
      ...live,
      status: 'paused',
      version: 3,
      pausedRemainingSeconds: 40,
      timer: { status: 'paused', remainingSeconds: 40, timerEndAt: null },
      timerEndAt: null,
      updatedAt: '2026-01-01T11:02:00.000Z',
    }

    const merged = mergeDraftSessionSnapshot(live, paused)
    expect(merged?.status).toBe('paused')
    expect(merged?.currentPick?.overall).toBe(3)
    expect(merged?.currentPick?.rosterId).toBe('r-a')
    expect(merged?.picks).toHaveLength(2)
  })

  it('resume restores in_progress with same pick epoch', () => {
    const paused = mergeDraftSessionSnapshot(
      null,
      {
        ...basePreDraft(),
        status: 'paused',
        version: 3,
        currentPick: {
          overall: 3,
          round: 2,
          slot: 1,
          rosterId: 'r-a',
          displayName: 'Alpha FC',
          pickLabel: '2.01',
        },
        picks: [],
        timer: { status: 'paused', remainingSeconds: 40, timerEndAt: null },
        pausedRemainingSeconds: 40,
        updatedAt: '2026-01-01T11:02:00.000Z',
      } as DraftSessionSnapshot,
    )!

    const resumed: DraftSessionSnapshot = {
      ...paused,
      status: 'in_progress',
      version: 4,
      timer: { status: 'running', remainingSeconds: 40, timerEndAt: '2026-01-01T12:10:00.000Z' },
      timerEndAt: '2026-01-01T12:10:00.000Z',
      pausedRemainingSeconds: null,
      updatedAt: '2026-01-01T11:03:00.000Z',
    }

    const merged = mergeDraftSessionSnapshot(paused, resumed)
    expect(merged?.status).toBe('in_progress')
    expect(merged?.currentPick?.overall).toBe(3)
  })

  it('does not regress live board to pre_draft on stale read (same pick count)', () => {
    const live = mergeDraftSessionSnapshot(
      null,
      {
        ...basePreDraft(),
        status: 'in_progress',
        version: 5,
        currentPick: {
          overall: 1,
          round: 1,
          slot: 1,
          rosterId: 'r-a',
          displayName: 'Alpha FC',
          pickLabel: '1.01',
        },
        picks: [],
        timer: { status: 'running', remainingSeconds: 80, timerEndAt: '2026-01-01T12:00:00.000Z' },
        timerEndAt: '2026-01-01T12:00:00.000Z',
        updatedAt: '2026-01-01T11:10:00.000Z',
      } as DraftSessionSnapshot,
    )!

    const stalePreDraft: DraftSessionSnapshot = {
      ...live,
      status: 'pre_draft',
      version: 1,
      currentPick: null,
      timer: timerNone,
      timerEndAt: null,
      updatedAt: '2026-01-01T10:00:00.000Z',
    }

    const merged = mergeDraftSessionSnapshot(live, stalePreDraft)
    expect(merged).toBe(live)
  })
})
