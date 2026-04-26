/**
 * Gate 3 — Analytics Privacy + Ingestion validation
 *
 * Unit tests for sanitizeChimmyAnalyticsMetadata and persistChimmyAIAnalyticsEvent.
 * Confirms that no raw prompt/response text reaches the DB layer, and that every
 * FORBIDDEN_METADATA_KEY is stripped regardless of where it appears.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

const analyticsCreateMock = vi.hoisted(() => vi.fn(async () => ({ id: 'evt-1' })))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    analyticsEvent: {
      create: analyticsCreateMock,
    },
  },
}))

import {
  sanitizeChimmyAnalyticsMetadata,
  persistChimmyAIAnalyticsEvent,
} from '@/lib/chimmy-chat/analytics-events'

// ---------------------------------------------------------------------------
// sanitizeChimmyAnalyticsMetadata — forbidden key stripping
// ---------------------------------------------------------------------------

describe('sanitizeChimmyAnalyticsMetadata — forbidden key removal', () => {
  const FORBIDDEN_KEYS = [
    'message',
    'prompt',
    'content',
    'response',
    'rawPrompt',
    'rawResponse',
    'messageText',
    'responseText',
  ] as const

  for (const key of FORBIDDEN_KEYS) {
    it(`strips "${key}" from metadata`, () => {
      const result = sanitizeChimmyAnalyticsMetadata({
        [key]: 'sensitive raw text that must never reach the DB',
        allowedField: 'keep me',
      })
      expect(result[key]).toBeUndefined()
      expect(result.allowedField).toBe('keep me')
    })
  }

  it('strips all forbidden keys simultaneously', () => {
    const input: Record<string, unknown> = {}
    for (const key of FORBIDDEN_KEYS) {
      input[key] = `raw value for ${key}`
    }
    input.safeField = 'safe'

    const result = sanitizeChimmyAnalyticsMetadata(input)

    for (const key of FORBIDDEN_KEYS) {
      expect(result[key]).toBeUndefined()
    }
    expect(result.safeField).toBe('safe')
  })

  it('returns empty object when input is undefined', () => {
    expect(sanitizeChimmyAnalyticsMetadata(undefined)).toEqual({})
  })

  it('returns empty object when input is empty', () => {
    expect(sanitizeChimmyAnalyticsMetadata({})).toEqual({})
  })

  it('preserves non-forbidden fields unchanged', () => {
    const result = sanitizeChimmyAnalyticsMetadata({
      issueCount: 3,
      kinds: ['ungrounded_stat'],
      surface: 'league',
    })
    expect(result.issueCount).toBe(3)
    expect(result.kinds).toEqual(['ungrounded_stat'])
    expect(result.surface).toBe('league')
  })
})

// ---------------------------------------------------------------------------
// sanitizeChimmyAnalyticsMetadata — string truncation
// ---------------------------------------------------------------------------

describe('sanitizeChimmyAnalyticsMetadata — string truncation', () => {
  it('truncates string values longer than 400 characters', () => {
    const longString = 'a'.repeat(600)
    const result = sanitizeChimmyAnalyticsMetadata({ longField: longString })
    const truncated = result.longField as string
    expect(truncated.length).toBeLessThanOrEqual(405) // 400 chars + ellipsis
    expect(truncated.startsWith('a'.repeat(400))).toBe(true)
    expect(truncated).toContain('…')
  })

  it('preserves string values at or below 400 characters', () => {
    const exactStr = 'b'.repeat(400)
    const result = sanitizeChimmyAnalyticsMetadata({ field: exactStr })
    expect(result.field).toBe(exactStr)
  })

  it('does not truncate non-string values', () => {
    const result = sanitizeChimmyAnalyticsMetadata({
      count: 42,
      flag: true,
      arr: [1, 2, 3],
    })
    expect(result.count).toBe(42)
    expect(result.flag).toBe(true)
    expect(result.arr).toEqual([1, 2, 3])
  })
})

// ---------------------------------------------------------------------------
// persistChimmyAIAnalyticsEvent — no raw text reaches DB
// ---------------------------------------------------------------------------

describe('persistChimmyAIAnalyticsEvent — no raw content reaches DB', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    analyticsCreateMock.mockResolvedValue({ id: 'evt-1' })
  })

  it('returns ok: true on successful persistence', async () => {
    const result = await persistChimmyAIAnalyticsEvent({
      event_name: 'message_send',
      user_id: 'user-abc',
      league_id: 'league-1',
      surface: 'league',
      action: 'message_submit',
      timestamp: new Date().toISOString(),
    })
    expect(result.ok).toBe(true)
    expect(analyticsCreateMock).toHaveBeenCalledOnce()
  })

  it('never stores raw prompt text in DB meta', async () => {
    await persistChimmyAIAnalyticsEvent({
      event_name: 'response_rendered',
      user_id: 'user-abc',
      surface: 'dashboard',
      action: 'response_success',
      metadata: {
        prompt: 'this is the user raw prompt — forbidden',
        rawPrompt: 'also forbidden',
        safeSignal: 'allowed',
      },
    })

    const createArg = analyticsCreateMock.mock.calls[0]?.[0] as {
      data: { meta: { metadata: Record<string, unknown> } }
    }
    const storedMeta = createArg.data.meta.metadata
    expect(storedMeta.prompt).toBeUndefined()
    expect(storedMeta.rawPrompt).toBeUndefined()
    expect(storedMeta.safeSignal).toBe('allowed')
  })

  it('never stores raw response text in DB meta', async () => {
    await persistChimmyAIAnalyticsEvent({
      event_name: 'contract_validation_failed',
      user_id: 'user-abc',
      surface: 'chimmy_chat' as 'dashboard',
      action: 'annotate',
      metadata: {
        response: 'the full ai response text — forbidden',
        rawResponse: 'also forbidden',
        responseText: 'and this too',
        issueCount: 2,
      },
    })

    const createArg = analyticsCreateMock.mock.calls[0]?.[0] as {
      data: { meta: { metadata: Record<string, unknown> } }
    }
    const storedMeta = createArg.data.meta.metadata
    expect(storedMeta.response).toBeUndefined()
    expect(storedMeta.rawResponse).toBeUndefined()
    expect(storedMeta.responseText).toBeUndefined()
    expect(storedMeta.issueCount).toBe(2)
  })

  it('user_id in DB row matches the event user_id', async () => {
    await persistChimmyAIAnalyticsEvent({
      event_name: 'chip_click',
      user_id: 'user-xyz',
      surface: 'war_room',
      action: 'chip_selected',
    })

    const createArg = analyticsCreateMock.mock.calls[0]?.[0] as {
      data: { userId: string }
    }
    expect(createArg.data.userId).toBe('user-xyz')
  })

  it('returns ok: false when prisma throws', async () => {
    analyticsCreateMock.mockRejectedValueOnce(new Error('DB connection failed'))

    const result = await persistChimmyAIAnalyticsEvent({
      event_name: 'feedback_submit',
      user_id: 'user-abc',
      surface: 'dashboard',
      action: 'thumbs_down',
    })

    expect(result.ok).toBe(false)
    expect(result.error).toContain('DB connection failed')
  })

  it('DB row uses toolKey chimmy_ai_chat', async () => {
    await persistChimmyAIAnalyticsEvent({
      event_name: 'followup_click',
      user_id: 'user-abc',
      surface: 'league',
      action: 'followup_selected',
    })

    const createArg = analyticsCreateMock.mock.calls[0]?.[0] as {
      data: { toolKey: string }
    }
    expect(createArg.data.toolKey).toBe('chimmy_ai_chat')
  })
})
