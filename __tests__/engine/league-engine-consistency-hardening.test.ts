/**
 * Composed consistency checks on synthetic snapshots (no DB).
 */

import { describe, expect, it } from 'vitest'
import {
  allConsistencyChecksPass,
  runLeagueEngineConsistencyChecks,
} from '@/lib/engine-testing/hardening/consistencyChecks'
import {
  assertNoDuplicateTradeAssets,
  assertUniqueLogicalIds,
} from '@/lib/engine-testing/hardening/engineInvariants'

describe('runLeagueEngineConsistencyChecks', () => {
  it('passes when draft session matches league and standings rows are consistent', () => {
    const snapshot = {
      expectedLeagueId: 'L1',
      draftSessionLeagueId: 'L1',
      standingsRows: [
        { rosterId: 'r1', wins: 5, losses: 4, ties: 1, gamesPlayed: 10 },
      ],
    }
    expect(allConsistencyChecksPass(snapshot)).toBe(true)
    const results = runLeagueEngineConsistencyChecks(snapshot)
    expect(results.every((x) => x.ok)).toBe(true)
  })

  it('fails on orphaned draft session league id', () => {
    const snapshot = {
      expectedLeagueId: 'L1',
      draftSessionLeagueId: 'OTHER',
    }
    expect(allConsistencyChecksPass(snapshot)).toBe(false)
  })

  it('fails on standings games played mismatch', () => {
    const snapshot = {
      expectedLeagueId: 'L1',
      standingsRows: [{ wins: 2, losses: 2, ties: 0, gamesPlayed: 3 }],
    }
    expect(allConsistencyChecksPass(snapshot)).toBe(false)
  })
})

describe('trade / id hardening helpers', () => {
  it('assertNoDuplicateTradeAssets rejects duplicate player refs', () => {
    const r = assertNoDuplicateTradeAssets([
      { itemType: 'player', itemReference: 'p1', fromRosterId: 'a', toRosterId: 'b' },
      { itemType: 'player', itemReference: 'p1', fromRosterId: 'b', toRosterId: 'a' },
    ])
    expect(r.ok).toBe(false)
  })

  it('assertUniqueLogicalIds rejects duplicates', () => {
    expect(assertUniqueLogicalIds(['a', 'b', 'a']).ok).toBe(false)
    expect(assertUniqueLogicalIds(['a', 'b']).ok).toBe(true)
  })
})
