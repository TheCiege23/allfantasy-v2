import { describe, expect, it } from 'vitest'

import { getTrajectory } from '@/lib/trajectory/service'
import type { TrajectoryAdapter, TrajectoryPoint } from '@/lib/trajectory/types'

/** A DB-free adapter that just replays the points it's handed. */
function fakeAdapter(
  points: TrajectoryPoint[],
  opts: { supported?: boolean; explain?: (p: TrajectoryPoint[]) => string | null } = {},
): TrajectoryAdapter<void> {
  return {
    metricId: 'test.metric',
    supported: opts.supported ?? true,
    async load() {
      return points
    },
    ...(opts.explain ? { explainChange: opts.explain } : {}),
  }
}

describe('getTrajectory (Phase 3.3 Snapshot History Service)', () => {
  it('returns current, previous, delta, and full ordered history', async () => {
    const traj = await getTrajectory(
      fakeAdapter([
        { value: 30, timestamp: '2026-01-01' },
        { value: 45, timestamp: '2026-02-01' },
      ]),
      undefined,
    )
    expect(traj.current?.value).toBe(45)
    expect(traj.previous?.value).toBe(30)
    expect(traj.delta?.absolute).toBe(15)
    expect(traj.delta?.direction).toBe('up')
    expect(traj.history.map((p) => p.value)).toEqual([30, 45])
    expect(traj.supported).toBe(true)
  })

  it('propagates supported=false so a current-state metric cannot masquerade as a trend', async () => {
    const traj = await getTrajectory(fakeAdapter([{ value: 70, timestamp: 't' }], { supported: false }), undefined)
    expect(traj.supported).toBe(false)
    expect(traj.delta).toBeNull()
    expect(traj.current?.value).toBe(70)
  })

  it('surfaces whyChanged from the adapter only when a change exists', async () => {
    const explain = () => 'Two managers set lineups this week.'
    const withChange = await getTrajectory(
      fakeAdapter(
        [
          { value: 30, timestamp: '2026-01-01' },
          { value: 45, timestamp: '2026-02-01' },
        ],
        { explain },
      ),
      undefined,
    )
    expect(withChange.whyChanged).toBe('Two managers set lineups this week.')

    // Single point → no change → no explanation, even if the adapter offers one.
    const noChange = await getTrajectory(fakeAdapter([{ value: 30, timestamp: '2026-01-01' }], { explain }), undefined)
    expect(noChange.whyChanged).toBeNull()
  })

  it('falls back to a point-level reason, and never fabricates one', async () => {
    const traj = await getTrajectory(
      fakeAdapter([
        { value: 30, timestamp: '2026-01-01' },
        { value: 45, timestamp: '2026-02-01', reason: 'Playoff picture firmed up.' },
      ]),
      undefined,
    )
    expect(traj.whyChanged).toBe('Playoff picture firmed up.')

    const silent = await getTrajectory(
      fakeAdapter([
        { value: 30, timestamp: '2026-01-01' },
        { value: 45, timestamp: '2026-02-01' },
      ]),
      undefined,
    )
    expect(silent.whyChanged).toBeNull()
  })

  it('honors the flat-epsilon option end-to-end', async () => {
    const traj = await getTrajectory(
      fakeAdapter([
        { value: 50, timestamp: '2026-01-01' },
        { value: 51, timestamp: '2026-02-01' },
      ]),
      undefined,
      { flatEpsilon: 2 },
    )
    expect(traj.delta?.direction).toBe('flat')
  })
})
