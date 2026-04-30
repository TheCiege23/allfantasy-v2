/**
 * Legacy draft-runtime write guard unit tests (Commit L).
 *
 * Pure logic tests — no Prisma, no fetch, no JSDOM. The guard is the
 * defensive boundary between the canonical
 * `lib/live-draft-engine/PickSubmissionService.submitPick` write path and
 * the legacy `lib/draft/execute-pick.ts` write path. Live writes through
 * the legacy path must throw `LegacyDraftRuntimeWriteBlockedError`; mock
 * writes must pass through unchanged.
 */

import { describe, expect, it } from 'vitest'
import {
  assertLegacyDraftRuntimeWriteAllowed,
  LegacyDraftRuntimeWriteBlockedError,
} from '@/lib/draft/legacy-runtime-write-guard'

describe('assertLegacyDraftRuntimeWriteAllowed', () => {
  it('passes through for mock mode', () => {
    expect(() =>
      assertLegacyDraftRuntimeWriteAllowed({
        route: 'test',
        operation: 'commit_pick',
        sessionId: 'mock-room-1',
        mode: 'mock',
      }),
    ).not.toThrow()
  })

  it('throws for live mode', () => {
    expect(() =>
      assertLegacyDraftRuntimeWriteAllowed({
        route: 'test',
        operation: 'commit_pick',
        sessionId: 'league-1',
        mode: 'live',
      }),
    ).toThrowError(LegacyDraftRuntimeWriteBlockedError)
  })

  it('error carries the route, operation, and sessionId so callers can map to a specific HTTP status', () => {
    try {
      assertLegacyDraftRuntimeWriteAllowed({
        route: 'lib/draft/execute-pick.ts:executeDraftPick',
        operation: 'commit_pick',
        sessionId: 'lg-abc',
        mode: 'live',
      })
      throw new Error('expected guard to throw')
    } catch (err) {
      expect(err).toBeInstanceOf(LegacyDraftRuntimeWriteBlockedError)
      const e = err as LegacyDraftRuntimeWriteBlockedError
      expect(e.route).toBe('lib/draft/execute-pick.ts:executeDraftPick')
      expect(e.operation).toBe('commit_pick')
      expect(e.sessionId).toBe('lg-abc')
      expect(e.message).toContain('Legacy DraftRoom runtime writes are blocked')
      expect(e.message).toContain('lg-abc')
      expect(e.message).toContain(
        '@/lib/live-draft-engine/PickSubmissionService.submitPick',
      )
    }
  })

  it('mock mode + commit_pick is allowed (mock CPU pick path)', () => {
    expect(() =>
      assertLegacyDraftRuntimeWriteAllowed({
        route: 'app/api/draft/mock/cpu-pick/route.ts',
        operation: 'commit_pick',
        sessionId: 'mock-room-x',
        mode: 'mock',
      }),
    ).not.toThrow()
  })

  it('live mode + any operation is blocked (live undo, live commissioner edit, etc.)', () => {
    for (const operation of ['commit_pick', 'undo_pick', 'auto_pick', 'commissioner_edit']) {
      expect(() =>
        assertLegacyDraftRuntimeWriteAllowed({
          route: 'test',
          operation,
          sessionId: 'lg-test',
          mode: 'live',
        }),
      ).toThrowError(LegacyDraftRuntimeWriteBlockedError)
    }
  })
})

describe('LegacyDraftRuntimeWriteBlockedError', () => {
  it('is a real Error subclass with name set', () => {
    const e = new LegacyDraftRuntimeWriteBlockedError({
      route: 'r',
      operation: 'op',
      sessionId: 's',
      mode: 'live',
    })
    expect(e).toBeInstanceOf(Error)
    expect(e).toBeInstanceOf(LegacyDraftRuntimeWriteBlockedError)
    expect(e.name).toBe('LegacyDraftRuntimeWriteBlockedError')
  })

  it('preserves the input fields on the instance', () => {
    const e = new LegacyDraftRuntimeWriteBlockedError({
      route: 'route-x',
      operation: 'op-y',
      sessionId: 'session-z',
      mode: 'live',
    })
    expect(e.route).toBe('route-x')
    expect(e.operation).toBe('op-y')
    expect(e.sessionId).toBe('session-z')
  })
})
