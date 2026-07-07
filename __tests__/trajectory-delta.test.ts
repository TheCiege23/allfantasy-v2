import { describe, expect, it } from 'vitest'

import { computeDelta, deriveTrajectoryCore } from '@/lib/trajectory/delta'
import type { TrajectoryPoint } from '@/lib/trajectory/types'

function pt(value: number, timestamp: string, confidence?: number): TrajectoryPoint {
  return { value, timestamp, ...(confidence !== undefined ? { confidence } : {}) }
}

describe('computeDelta (Phase 3.3 Delta Engine)', () => {
  it('reports direction up/down/flat and a signed absolute change', () => {
    expect(computeDelta(pt(40, 'a'), pt(55, 'b')).direction).toBe('up')
    expect(computeDelta(pt(55, 'a'), pt(40, 'b')).direction).toBe('down')
    expect(computeDelta(pt(40, 'a'), pt(40, 'b')).direction).toBe('flat')
    expect(computeDelta(pt(40, 'a'), pt(55, 'b')).absolute).toBe(15)
    expect(computeDelta(pt(55, 'a'), pt(40, 'b')).absolute).toBe(-15)
  })

  it('honors a per-call flat epsilon so small moves read as flat', () => {
    expect(computeDelta(pt(50, 'a'), pt(51, 'b'), { flatEpsilon: 2 }).direction).toBe('flat')
    expect(computeDelta(pt(50, 'a'), pt(53, 'b'), { flatEpsilon: 2 }).direction).toBe('up')
  })

  it('computes percent relative to the previous value', () => {
    expect(computeDelta(pt(40, 'a'), pt(50, 'b')).percent).toBeCloseTo(25)
    // Negative base uses |previous| as the denominator, keeps the signed numerator.
    expect(computeDelta(pt(-40, 'a'), pt(-50, 'b')).percent).toBeCloseTo(-25)
  })

  it('returns null percent when the previous value is 0 (no honest denominator)', () => {
    expect(computeDelta(pt(0, 'a'), pt(10, 'b')).percent).toBeNull()
  })

  it('passes through source confidence only when the current point has it', () => {
    expect(computeDelta(pt(40, 'a', 0.8), pt(50, 'b', 0.9)).confidence).toBe(0.9)
    expect(computeDelta(pt(40, 'a', 0.8), pt(50, 'b')).confidence).toBeNull()
  })

  it('dates the change to the current point', () => {
    expect(computeDelta(pt(40, '2026-01-01'), pt(50, '2026-02-01')).changedAt).toBe('2026-02-01')
  })
})

describe('deriveTrajectoryCore', () => {
  it('sorts oldest→newest and picks current/previous from the ends', () => {
    const core = deriveTrajectoryCore('m', [pt(50, '2026-03-01'), pt(30, '2026-01-01'), pt(40, '2026-02-01')])
    expect(core.history.map((p) => p.value)).toEqual([30, 40, 50])
    expect(core.current?.value).toBe(50)
    expect(core.previous?.value).toBe(40)
    expect(core.delta?.absolute).toBe(10)
  })

  it('returns delta null with a single point — current state is not history', () => {
    const core = deriveTrajectoryCore('m', [pt(42, '2026-01-01')])
    expect(core.current?.value).toBe(42)
    expect(core.previous).toBeNull()
    expect(core.delta).toBeNull()
  })

  it('returns all-null with no points', () => {
    const core = deriveTrajectoryCore('m', [])
    expect(core.current).toBeNull()
    expect(core.previous).toBeNull()
    expect(core.delta).toBeNull()
    expect(core.history).toEqual([])
  })
})
