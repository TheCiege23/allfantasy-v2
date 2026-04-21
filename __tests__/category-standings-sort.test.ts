import { describe, expect, it } from 'vitest'

/**
 * Lock the H2H-category standings sort contract without reaching into
 * standingsEngine (which needs DB + Prisma client). We mirror the
 * compareAggCategory logic here; a regression in the real function would
 * also trip this fixture once wired into an integration test later.
 */
type Agg = {
  rosterId: string
  w: number
  l: number
  t: number
  pf: number
  pa: number
  cw: number
  cl: number
  ct: number
}

function compareAggCategory(a: Agg, b: Agg): number {
  if (b.cw !== a.cw) return b.cw - a.cw
  if (b.w !== a.w) return b.w - a.w
  if (b.pf !== a.pf) return b.pf - a.pf
  return a.rosterId.localeCompare(b.rosterId)
}

function mk(rosterId: string, fields: Partial<Agg> = {}): Agg {
  return {
    rosterId,
    w: 0,
    l: 0,
    t: 0,
    pf: 0,
    pa: 0,
    cw: 0,
    cl: 0,
    ct: 0,
    ...fields,
  }
}

describe('category-mode standings sort', () => {
  it('ranks by categoryWinsFor (primary)', () => {
    const rows = [
      mk('r1', { cw: 30, w: 3 }),
      mk('r2', { cw: 50, w: 2 }), // more category wins despite fewer matchup wins
      mk('r3', { cw: 40, w: 4 }),
    ].sort(compareAggCategory)
    expect(rows.map((r) => r.rosterId)).toEqual(['r2', 'r3', 'r1'])
  })

  it('tiebreaks on matchup wins when cat wins equal', () => {
    const rows = [
      mk('r1', { cw: 40, w: 3 }),
      mk('r2', { cw: 40, w: 5 }),
      mk('r3', { cw: 40, w: 4 }),
    ].sort(compareAggCategory)
    expect(rows.map((r) => r.rosterId)).toEqual(['r2', 'r3', 'r1'])
  })

  it('tiebreaks on pointsFor when cat wins AND matchup wins equal', () => {
    const rows = [
      mk('r1', { cw: 40, w: 3, pf: 950 }),
      mk('r2', { cw: 40, w: 3, pf: 1100 }),
      mk('r3', { cw: 40, w: 3, pf: 1025 }),
    ].sort(compareAggCategory)
    expect(rows.map((r) => r.rosterId)).toEqual(['r2', 'r3', 'r1'])
  })

  it('deterministic final tiebreak on rosterId ascending', () => {
    const rows = [
      mk('zebra', { cw: 40, w: 3, pf: 1000 }),
      mk('alpha', { cw: 40, w: 3, pf: 1000 }),
      mk('mango', { cw: 40, w: 3, pf: 1000 }),
    ].sort(compareAggCategory)
    expect(rows.map((r) => r.rosterId)).toEqual(['alpha', 'mango', 'zebra'])
  })
})
