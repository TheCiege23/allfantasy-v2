import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { publish } = vi.hoisted(() => ({
  publish: vi.fn(),
}))

vi.mock('@/lib/league-events/realtime-store', () => ({
  leagueRealtimeStore: { publish },
}))

import { publishMatchupLiveTickDebounced } from '@/lib/realtime-events/realtimeEventService'

describe('publishMatchupLiveTickDebounced', () => {
  beforeEach(() => {
    publish.mockClear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('coalesces rapid calls for the same league+week into one SSE publish', async () => {
    publishMatchupLiveTickDebounced('league-a', 5, { tick: 1 }, 80)
    publishMatchupLiveTickDebounced('league-a', 5, { tick: 2 }, 80)
    publishMatchupLiveTickDebounced('league-a', 5, { tick: 3 }, 80)

    expect(publish).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(80)

    expect(publish).toHaveBeenCalledTimes(1)
    expect(publish).toHaveBeenCalledWith(
      'league-a',
      expect.objectContaining({
        eventType: 'matchup_live_tick',
        message: 'Matchup update',
        meta: expect.objectContaining({ week: 5, tick: 3 }),
      }),
    )
  })

  it('uses separate timers per league+week', async () => {
    publishMatchupLiveTickDebounced('L1', 1, {}, 50)
    publishMatchupLiveTickDebounced('L2', 1, {}, 50)

    await vi.advanceTimersByTimeAsync(50)

    expect(publish).toHaveBeenCalledTimes(2)
    expect(publish).toHaveBeenNthCalledWith(1, 'L1', expect.any(Object))
    expect(publish).toHaveBeenNthCalledWith(2, 'L2', expect.any(Object))
  })
})
