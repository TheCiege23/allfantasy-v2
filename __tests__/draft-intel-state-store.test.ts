import { describe, expect, it, vi } from 'vitest'

import { draftIntelStateStore } from '@/lib/draft-intelligence'

describe('draftIntelStateStore', () => {
  it('stores snapshots and emits queue update envelopes', () => {
    const listener = vi.fn()
    const unsubscribe = draftIntelStateStore.subscribe('league-1', 'user-1', listener)

    const state = {
      leagueId: 'league-1',
      userId: 'user-1',
      rosterId: 'roster-1',
      leagueName: 'League One',
      sport: 'NFL',
      sessionId: 'session-1',
      status: 'active',
      trigger: 'pick_update',
      currentOverall: 10,
      userNextOverall: 15,
      picksUntilUser: 5,
      generatedAt: '2026-03-30T00:00:00.000Z',
      updatedAt: '2026-03-30T00:00:00.000Z',
      headline: 'Queue ready',
      queue: [],
      predictions: [],
      messages: {
        ready: 'ready',
        update: 'update',
        onClock: 'on clock',
      },
      recap: null,
      archived: false,
    } as const

    draftIntelStateStore.set('queue_update', state as any)

    expect(draftIntelStateStore.get('league-1', 'user-1')?.headline).toBe('Queue ready')
    expect(listener).toHaveBeenCalledWith({
      type: 'queue_update',
      leagueId: 'league-1',
      userId: 'user-1',
      state,
    })

    unsubscribe()
  })
})
