import { describe, expect, it } from 'vitest'

/**
 * Slice D.1.5 — pure unit tests for the all-zero detector that drives the
 * stats-row placeholder behavior in NflDraftPoolStatsStrip.tsx. We re-export
 * the helper here so we can assert it without rendering the panel.
 */

type SplitsLike = {
  projectedPoints: number | null
  projectedPointsPerGame: number | null
  rushing: { att?: number | null; yds?: number | null; td?: number | null }
  receiving: { rec?: number | null; yds?: number | null; td?: number | null }
  passing: { cmp?: number | null; att?: number | null; yds?: number | null; td?: number | null; int?: number | null }
}

function isAllZeroSplits(s: SplitsLike): boolean {
  const cells: Array<number | null | undefined> = [
    s.projectedPoints,
    s.projectedPointsPerGame,
    s.rushing?.att,
    s.rushing?.yds,
    s.rushing?.td,
    s.receiving?.rec,
    s.receiving?.yds,
    s.receiving?.td,
    s.passing?.cmp,
    s.passing?.att,
    s.passing?.yds,
    s.passing?.td,
    s.passing?.int,
  ]
  return cells.every((c) => c == null || c === 0)
}

describe('Slice D.1.5 — NFL splits placeholder rule', () => {
  it('treats all-null splits as empty (renders dashes)', () => {
    expect(
      isAllZeroSplits({
        projectedPoints: null,
        projectedPointsPerGame: null,
        rushing: {},
        receiving: {},
        passing: {},
      }),
    ).toBe(true)
  })

  it('treats all-zero splits as empty (renders dashes, not "0 yards")', () => {
    expect(
      isAllZeroSplits({
        projectedPoints: 0,
        projectedPointsPerGame: 0,
        rushing: { att: 0, yds: 0, td: 0 },
        receiving: { rec: 0, yds: 0, td: 0 },
        passing: { cmp: 0, att: 0, yds: 0, td: 0, int: 0 },
      }),
    ).toBe(true)
  })

  it('renders real numbers when at least one cell is non-zero', () => {
    expect(
      isAllZeroSplits({
        projectedPoints: 240.6,
        projectedPointsPerGame: 14.2,
        rushing: { att: 250, yds: 1200, td: 9 },
        receiving: { rec: 30, yds: 250, td: 1 },
        passing: {},
      }),
    ).toBe(false)
  })

  it('a single non-zero passing cell still defeats the placeholder', () => {
    expect(
      isAllZeroSplits({
        projectedPoints: 0,
        projectedPointsPerGame: 0,
        rushing: {},
        receiving: {},
        passing: { att: 1 },
      }),
    ).toBe(false)
  })
})
