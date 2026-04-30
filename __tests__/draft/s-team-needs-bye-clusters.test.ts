/**
 * Team needs + bye-week clustering — unit tests (Commit S).
 *
 * Pure logic on `computeTeamNeeds` and `detectByeWeekClusters`. No
 * Prisma, no fetch, no JSDOM. The DraftTeamPanel render contract is
 * pinned by `__tests__/nfl-redraft-war-room-team-needs.test.ts`.
 */

import { describe, expect, it } from 'vitest'
import {
  computeTeamNeeds,
  detectByeWeekClusters,
} from '@/lib/draft-room/teamNeeds'

describe('computeTeamNeeds — driven by starterSlots', () => {
  it('returns empty when starterSlots is null / undefined', () => {
    expect(computeTeamNeeds({ picks: [], starterSlots: null })).toEqual([])
    expect(computeTeamNeeds({ picks: [{ position: 'RB' }], starterSlots: undefined })).toEqual([])
  })

  it('returns empty when starterSlots is empty', () => {
    expect(computeTeamNeeds({ picks: [{ position: 'RB' }], starterSlots: {} })).toEqual([])
  })

  it('counts drafted picks per starter slot key (case-insensitive position match)', () => {
    const out = computeTeamNeeds({
      picks: [
        { position: 'rb' },
        { position: 'RB' },
        { position: 'WR' },
      ],
      starterSlots: { QB: 1, RB: 2, WR: 2, TE: 1 },
    })
    const byPos = Object.fromEntries(out.map((n) => [n.position, n]))
    expect(byPos.QB.have).toBe(0)
    expect(byPos.QB.target).toBe(1)
    expect(byPos.QB.remaining).toBe(1)
    expect(byPos.QB.tone).toBe('thin')
    expect(byPos.RB.have).toBe(2)
    expect(byPos.RB.tone).toBe('ok')
    expect(byPos.RB.remaining).toBe(0)
    expect(byPos.WR.have).toBe(1)
    expect(byPos.WR.tone).toBe('thin')
    expect(byPos.WR.remaining).toBe(1)
    expect(byPos.TE.have).toBe(0)
    expect(byPos.TE.tone).toBe('thin')
  })

  it('classifies tone="heavy" when picks ≥ target + 2', () => {
    const out = computeTeamNeeds({
      picks: [
        { position: 'RB' },
        { position: 'RB' },
        { position: 'RB' },
        { position: 'RB' },
      ],
      starterSlots: { RB: 2 },
    })
    expect(out[0].tone).toBe('heavy')
    expect(out[0].have).toBe(4)
    expect(out[0].remaining).toBe(0)
  })

  it('classifies tone="ok" when picks === target', () => {
    const out = computeTeamNeeds({
      picks: [{ position: 'QB' }],
      starterSlots: { QB: 1 },
    })
    expect(out[0].tone).toBe('ok')
  })

  it('classifies tone="thin" when picks < target (and a depth pick at target+1 stays "ok" not "heavy")', () => {
    const thin = computeTeamNeeds({
      picks: [],
      starterSlots: { TE: 1 },
    })
    expect(thin[0].tone).toBe('thin')
    expect(thin[0].remaining).toBe(1)

    const okDepth = computeTeamNeeds({
      picks: [{ position: 'TE' }, { position: 'TE' }],
      starterSlots: { TE: 1 },
    })
    expect(okDepth[0].tone).toBe('ok')
  })

  it('ignores starter slots with non-finite or non-positive targets', () => {
    const out = computeTeamNeeds({
      picks: [{ position: 'QB' }],
      starterSlots: {
        QB: 1,
        BAD: 0,
        WORSE: -1,
        NAN: Number.NaN as unknown as number,
      },
    })
    expect(out.map((n) => n.position)).toEqual(['QB'])
  })

  it('IDP / DEF / K leagues work without a hardcoded position list', () => {
    const out = computeTeamNeeds({
      picks: [
        { position: 'DL' },
        { position: 'DL' },
        { position: 'LB' },
        { position: 'DEF' },
        { position: 'K' },
      ],
      starterSlots: { DL: 2, LB: 2, DB: 2, DEF: 1, K: 1 },
    })
    const byPos = Object.fromEntries(out.map((n) => [n.position, n]))
    expect(byPos.DL.tone).toBe('ok')
    expect(byPos.LB.tone).toBe('thin')
    expect(byPos.DB.tone).toBe('thin')
    expect(byPos.DEF.tone).toBe('ok')
    expect(byPos.K.tone).toBe('ok')
  })

  it('picks at positions not in starterSlots are not surfaced as needs', () => {
    const out = computeTeamNeeds({
      picks: [{ position: 'RB' }, { position: 'P' }],
      starterSlots: { RB: 1 },
    })
    expect(out.map((n) => n.position)).toEqual(['RB'])
  })
})

describe('detectByeWeekClusters — 3+ shared bye threshold', () => {
  it('returns empty for empty / no-bye picks', () => {
    expect(detectByeWeekClusters([])).toEqual([])
    expect(
      detectByeWeekClusters([
        { position: 'RB', byeWeek: null },
        { position: 'WR' },
      ]),
    ).toEqual([])
  })

  it('flags a cluster of 3 starters sharing a bye', () => {
    const out = detectByeWeekClusters([
      { position: 'RB', byeWeek: 7 },
      { position: 'WR', byeWeek: 7 },
      { position: 'TE', byeWeek: 7 },
      { position: 'QB', byeWeek: 9 },
    ])
    expect(out).toEqual([
      { byeWeek: 7, count: 3, positions: ['RB', 'TE', 'WR'] },
    ])
  })

  it('does NOT flag a cluster of 2', () => {
    const out = detectByeWeekClusters([
      { position: 'RB', byeWeek: 5 },
      { position: 'WR', byeWeek: 5 },
    ])
    expect(out).toEqual([])
  })

  it('sorts clusters by count desc, then byeWeek asc', () => {
    const picks = [
      // 4 starters bye 12
      { position: 'QB', byeWeek: 12 },
      { position: 'RB', byeWeek: 12 },
      { position: 'WR', byeWeek: 12 },
      { position: 'TE', byeWeek: 12 },
      // 3 starters bye 7
      { position: 'WR', byeWeek: 7 },
      { position: 'RB', byeWeek: 7 },
      { position: 'TE', byeWeek: 7 },
      // 3 starters bye 9
      { position: 'WR', byeWeek: 9 },
      { position: 'RB', byeWeek: 9 },
      { position: 'TE', byeWeek: 9 },
    ]
    const out = detectByeWeekClusters(picks)
    expect(out.map((c) => c.byeWeek)).toEqual([12, 7, 9])
  })

  it('threshold parameter controls minimum count', () => {
    const out = detectByeWeekClusters(
      [
        { position: 'RB', byeWeek: 5 },
        { position: 'WR', byeWeek: 5 },
      ],
      2,
    )
    expect(out).toHaveLength(1)
    expect(out[0]).toEqual({ byeWeek: 5, count: 2, positions: ['RB', 'WR'] })
  })

  it('drops zero / negative / non-finite bye weeks silently', () => {
    expect(
      detectByeWeekClusters([
        { position: 'RB', byeWeek: 0 },
        { position: 'WR', byeWeek: -1 },
        { position: 'TE', byeWeek: Number.NaN as unknown as number },
        { position: 'QB', byeWeek: 9 },
      ]),
    ).toEqual([])
  })

  it('floors fractional bye weeks (defensive coercion)', () => {
    const out = detectByeWeekClusters(
      [
        { position: 'RB', byeWeek: 7.5 },
        { position: 'WR', byeWeek: 7.2 },
        { position: 'TE', byeWeek: 7 },
      ],
    )
    expect(out).toEqual([
      { byeWeek: 7, count: 3, positions: ['RB', 'TE', 'WR'] },
    ])
  })
})
