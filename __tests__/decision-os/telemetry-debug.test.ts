import { afterEach, describe, expect, it } from 'vitest'
import { emitDecisionTelemetry } from '@/lib/decision-os/core/telemetry'
import {
  clearDecisionTelemetryDebugEvents,
  listDecisionTelemetryDebugEvents,
} from '@/lib/decision-os/core/telemetryDebugStore'

describe('Decision OS telemetry debug store', () => {
  const originalEnabled = process.env.DECISION_OS_DEBUG_TELEMETRY
  const originalLimit = process.env.DECISION_OS_DEBUG_TELEMETRY_LIMIT

  afterEach(() => {
    process.env.DECISION_OS_DEBUG_TELEMETRY = originalEnabled
    process.env.DECISION_OS_DEBUG_TELEMETRY_LIMIT = originalLimit
    clearDecisionTelemetryDebugEvents()
  })

  it('captures emitted telemetry and filters by user, league, and decision id', () => {
    process.env.DECISION_OS_DEBUG_TELEMETRY = 'true'

    emitDecisionTelemetry(
      'decision.issued',
      'commissioner.league.health',
      { userId: 'user-1', leagueId: 'league-1' },
      'dec-1',
    )
    emitDecisionTelemetry(
      'decision.shadow_parity',
      'manager.waiver.claim',
      { userId: 'user-2', leagueId: 'league-2' },
      'dec-2',
    )

    expect(listDecisionTelemetryDebugEvents({ userId: 'user-1' })).toHaveLength(1)
    expect(listDecisionTelemetryDebugEvents({ leagueId: 'league-2' })).toHaveLength(1)
    expect(listDecisionTelemetryDebugEvents({ decisionId: 'dec-1' })).toHaveLength(1)
    expect(listDecisionTelemetryDebugEvents({ event: 'decision.shadow_parity' })[0]?.decision_id).toBe('dec-2')
  })

  it('enforces the configured ring-buffer limit', () => {
    process.env.DECISION_OS_DEBUG_TELEMETRY = 'true'
    process.env.DECISION_OS_DEBUG_TELEMETRY_LIMIT = '2'

    emitDecisionTelemetry('decision.issued', 'manager.lineup.set', { userId: 'user-1', leagueId: 'league-1' }, 'dec-1')
    emitDecisionTelemetry('decision.issued', 'manager.waiver.claim', { userId: 'user-1', leagueId: 'league-1' }, 'dec-2')
    emitDecisionTelemetry('decision.issued', 'commissioner.league.health', { userId: 'user-1', leagueId: 'league-1' }, 'dec-3')

    const events = listDecisionTelemetryDebugEvents()
    expect(events).toHaveLength(2)
    expect(events.map((event) => event.decision_id)).toEqual(['dec-3', 'dec-2'])
  })
})
