import { describe, expect, it } from 'vitest'

import {
  LegacyDraftRuntimeWriteBlockedError,
  assertLegacyDraftRuntimeWriteAllowed,
} from '@/lib/draft/legacy-runtime-write-guard'

describe('legacy runtime write guard', () => {
  it('throws when a live session attempts legacy DraftRoom runtime writes', () => {
    expect(() =>
      assertLegacyDraftRuntimeWriteAllowed({
        route: 'app/api/draft/example/route.ts',
        operation: 'update DraftRoomStateRow',
        sessionId: 'live:league-1',
        mode: 'live',
      }),
    ).toThrow(LegacyDraftRuntimeWriteBlockedError)
  })

  it('allows mock session legacy writes for compatibility paths', () => {
    expect(() =>
      assertLegacyDraftRuntimeWriteAllowed({
        route: 'app/api/draft/example/route.ts',
        operation: 'update DraftRoomStateRow',
        sessionId: 'mock:room-1',
        mode: 'mock',
      }),
    ).not.toThrow()
  })
})
