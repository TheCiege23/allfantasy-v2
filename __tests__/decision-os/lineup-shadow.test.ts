import { describe, it, expect, vi, afterEach } from 'vitest'
import { runLineupShadow, runLineupShadowForSummary, shouldRunLineupShadow } from '@/lib/decision-os/lineup/shadow'
import { registerDecisionTelemetrySink } from '@/lib/decision-os/core/telemetry'
import type { RunLineupSetInput } from '@/lib/decision-os/lineup'
import { fakeValidate, payload, action } from './lineupFakes'

const input = (leagueId = 'L1'): RunLineupSetInput => ({
  sport: 'NFL',
  leagueSettings: {},
  leagueWeek: 1,
  editingWeek: 1,
  userId: 'u1',
  leagueId,
  rosterId: 'r1',
  players: [],
})

afterEach(() => registerDecisionTelemetrySink(null))

describe('shouldRunLineupShadow (feature flag)', () => {
  it('true only when DECISION_OS_LINEUP_SHADOW=true', () => {
    expect(shouldRunLineupShadow({ DECISION_OS_LINEUP_SHADOW: 'true' } as never)).toBe(true)
    expect(shouldRunLineupShadow({ DECISION_OS_LINEUP_SHADOW: 'TRUE' } as never)).toBe(true)
    expect(shouldRunLineupShadow({ DECISION_OS_LINEUP_SHADOW: 'false' } as never)).toBe(false)
    expect(shouldRunLineupShadow({} as never)).toBe(false)
  })
})

describe('runLineupShadow — beside legacy, never affecting it', () => {
  it('runs and reports parity PASS (decision fed the same legacy summary = no drift)', async () => {
    const summary = payload('L1', [action('L1')])
    const res = await runLineupShadow(
      { userId: 'u1', leagueId: 'L1', legacySummary: summary },
      { loadInputs: async () => input('L1'), ruleDeps: { validateRedraft: fakeValidate() } },
    )
    expect(res.ran).toBe(true)
    expect(res.parity?.passed).toBe(true)
  })

  it('skips gracefully when inputs are unavailable (non-redraft / missing data)', async () => {
    const res = await runLineupShadow(
      { userId: 'u1', leagueId: 'L1', legacySummary: payload('L1') },
      { loadInputs: async () => null, ruleDeps: { validateRedraft: fakeValidate() } },
    )
    expect(res.ran).toBe(false)
    expect(res.error).toBe('inputs_unavailable')
  })

  it('NEVER throws when the loader throws', async () => {
    const res = await runLineupShadow(
      { userId: 'u1', leagueId: 'L1', legacySummary: payload('L1') },
      { loadInputs: async () => { throw new Error('db down') }, ruleDeps: { validateRedraft: fakeValidate() } },
    )
    expect(res.ran).toBe(false)
    expect(res.error).toBeTruthy()
  })

  it('NEVER throws when the Decision OS path throws (legacy stays safe)', async () => {
    const res = await runLineupShadow(
      { userId: 'u1', leagueId: 'L1', legacySummary: payload('L1') },
      { loadInputs: async () => input('L1'), ruleDeps: { validateRedraft: () => { throw new Error('rule boom') } } },
    )
    expect(res.ran).toBe(false)
  })

  it('emits shadow parity telemetry', async () => {
    const events: unknown[] = []
    registerDecisionTelemetrySink((e) => events.push(e))
    await runLineupShadow(
      { userId: 'u1', leagueId: 'L1', legacySummary: payload('L1', [action('L1')]) },
      { loadInputs: async () => input('L1'), ruleDeps: { validateRedraft: fakeValidate() } },
    )
    expect(events.some((e) => (e as { event: string }).event === 'decision.parity')).toBe(true)
  })
})

describe('runLineupShadowForSummary — cost-bounded, resilient', () => {
  it('caps the number of leagues shadowed and never throws', async () => {
    const loadInputs = vi.fn(async (_u: string, l: string) => input(l))
    const summary = payload('L1', [action('L1')])
    const results = await runLineupShadowForSummary('u1', summary, { maxLeagues: 1 }, { loadInputs, ruleDeps: { validateRedraft: fakeValidate() } })
    expect(results).toHaveLength(1)
    expect(results[0].ran).toBe(true)
  })
})
