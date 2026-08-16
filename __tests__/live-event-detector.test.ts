import { describe, expect, it } from 'vitest'
import {
  detectEvents,
  pollIntervalSeconds,
  selectNotifiable,
  type GameSnapshot,
} from '@/lib/live/eventDetector'

const AT = new Date('2026-09-13T18:00:00Z')

function snap(stats: Record<string, number>, status = 'in_progress'): GameSnapshot {
  return {
    gameId: 'G1',
    status,
    capturedAt: AT,
    players: [{ playerId: 'p1', playerName: 'Test Player', team: 'KC', stats }],
  }
}

describe('event detection', () => {
  it('emits NOTHING on the first snapshot', () => {
    // Joining a game at half-time must not fire an alert for every TD already
    // scored. The first poll is a baseline, not a burst of stale news.
    const events = detectEvents(null, snap({ rushing_touchdowns: 3, rushing_long: 45 }))
    expect(events).toHaveLength(0)
  })

  it('detects a touchdown exactly once', () => {
    const e = detectEvents(snap({ rushing_touchdowns: 0 }), snap({ rushing_touchdowns: 1 }))
    expect(e).toHaveLength(1)
    expect(e[0].type).toBe('TOUCHDOWN')
    expect(e[0].detail).toContain('rushing TD')
  })

  it('separates defensive and special-teams scores from offensive ones', () => {
    const e = detectEvents(
      snap({ defense_touchdowns: 0, kick_return_touchdowns: 0 }),
      snap({ defense_touchdowns: 1, kick_return_touchdowns: 1 })
    )
    expect(e.map((x) => x.type).sort()).toEqual(['DEFENSIVE_SCORE', 'SPECIAL_TEAMS_SCORE'])
  })

  it('detects turnovers', () => {
    const e = detectEvents(snap({ fumbles_lost: 0 }), snap({ fumbles_lost: 1 }))
    expect(e[0].type).toBe('TURNOVER')
  })

  describe('the rushing_long limitation — the documented product constraint', () => {
    it('fires on the FIRST big play', () => {
      const e = detectEvents(snap({ rushing_long: 8 }), snap({ rushing_long: 40 }))
      expect(e).toHaveLength(1)
      expect(e[0].type).toBe('BIG_PLAY')
      expect(e[0].detail).toContain('40 yard rush')
    })

    it('CANNOT see a second big play behind a longer one — this is expected', () => {
      // A 25-yard run after an existing 40-yarder leaves rushing_long at 40.
      // Asserting the miss keeps the limitation honest: if someone later claims
      // "every 20+ yard play", this test contradicts them.
      const e = detectEvents(snap({ rushing_long: 40 }), snap({ rushing_long: 40 }))
      expect(e).toHaveLength(0)
    })

    it('ignores a long gain below the threshold', () => {
      const e = detectEvents(snap({ rushing_long: 2 }), snap({ rushing_long: 12 }))
      expect(e).toHaveLength(0)
    })
  })

  it('IGNORES negative deltas — a stat correction is not a play', () => {
    // Providers revise numbers downward mid-game. Treating that as an event would
    // fire "touchdown!" in reverse.
    const e = detectEvents(snap({ rushing_touchdowns: 2 }), snap({ rushing_touchdowns: 1 }))
    expect(e).toHaveLength(0)
  })

  it('produces a retry-stable idempotency key', () => {
    const a = detectEvents(snap({ rushing_touchdowns: 0 }), snap({ rushing_touchdowns: 1 }))
    const b = detectEvents(snap({ rushing_touchdowns: 0 }), snap({ rushing_touchdowns: 1 }))
    // Same underlying state change -> same key, so a re-poll dedupes rather than
    // double-notifying.
    expect(a[0].idempotencyKey).toBe(b[0].idempotencyKey)
    expect(a[0].idempotencyKey).toContain('rushing_touchdowns')
  })

  it('treats a player absent from the previous snapshot as starting from zero', () => {
    const prev: GameSnapshot = { gameId: 'G1', status: 'in_progress', capturedAt: AT, players: [] }
    const e = detectEvents(prev, snap({ rushing_touchdowns: 1 }))
    expect(e).toHaveLength(1)
  })
})

describe('poll cadence', () => {
  it('polls fast while live and stops when final', () => {
    expect(pollIntervalSeconds('in_progress')).toBe(12)
    expect(pollIntervalSeconds('Final')).toBe(0)
    expect(pollIntervalSeconds('scheduled')).toBe(60)
  })
})

describe('notification selection — the attention budget', () => {
  const mk = (playerId: string, type: 'TOUCHDOWN' | 'BIG_PLAY') => ({
    gameId: 'G1', playerId, playerName: playerId, team: 'KC',
    type, stat: 's', delta: 1, value: 1, detectedAt: AT,
    idempotencyKey: `${playerId}|${type}`, detail: '',
  })

  it('defaults to the user\'s own players', () => {
    const out = selectNotifiable(
      [mk('mine', 'TOUCHDOWN'), mk('theirs', 'TOUCHDOWN')],
      { rosteredPlayerIds: new Set(['mine']), maxPerWindow: 10 }
    )
    expect(out.map((e) => e.playerId)).toEqual(['mine'])
  })

  it('ranks touchdowns above long gains when the cap bites', () => {
    // With one slot, the TD must win — a 21-yard gain usually is not news.
    const out = selectNotifiable(
      [mk('a', 'BIG_PLAY'), mk('b', 'TOUCHDOWN')],
      { rosteredPlayerIds: new Set(['a', 'b']), maxPerWindow: 1 }
    )
    expect(out).toHaveLength(1)
    expect(out[0].type).toBe('TOUCHDOWN')
  })

  it('enforces the cap, because an uncapped feed is spam', () => {
    const many = Array.from({ length: 50 }, (_, i) => mk(`p${i}`, 'TOUCHDOWN'))
    const ids = new Set(many.map((m) => m.playerId))
    expect(selectNotifiable(many, { rosteredPlayerIds: ids, maxPerWindow: 5 })).toHaveLength(5)
  })
})
