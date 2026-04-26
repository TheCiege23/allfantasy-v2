import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createMockNextRequest } from '@/__tests__/helpers/createMockNextRequest'

const getServerSessionMock = vi.hoisted(() => vi.fn())
const consumeRateLimitMock = vi.hoisted(() =>
  vi.fn(() => ({
    success: true,
    remaining: 89,
    retryAfterSec: 0,
    limit: 90,
    resetAt: Date.now() + 60_000,
  }))
)
const analyticsCreateMock = vi.hoisted(() => vi.fn(async () => ({})))

vi.mock('next-auth', () => ({
  getServerSession: getServerSessionMock,
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/lib/rate-limit', () => ({
  consumeRateLimit: consumeRateLimitMock,
  getClientIp: vi.fn(() => '127.0.0.1'),
  buildRateLimit429: vi.fn(({ message }: { message?: string }) => ({
    error: message ?? 'Rate limited',
  })),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    analyticsEvent: {
      create: analyticsCreateMock,
    },
  },
}))

import { POST } from '@/app/api/ai/events/route'

describe('POST /api/ai/events', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getServerSessionMock.mockResolvedValue({ user: { id: 'user-1' } })
    consumeRateLimitMock.mockReturnValue({
      success: true,
      remaining: 89,
      retryAfterSec: 0,
      limit: 90,
      resetAt: Date.now() + 60_000,
    })
    analyticsCreateMock.mockResolvedValue({ id: 'evt-1' })
  })

  it('returns 401 when unauthenticated', async () => {
    getServerSessionMock.mockResolvedValueOnce(null)
    const req = createMockNextRequest('http://localhost:3000/api/ai/events', {
      method: 'POST',
      body: {},
    })

    const res = await POST(req)

    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toMatchObject({ error: 'Unauthorized' })
  })

  it('returns 400 on invalid payload', async () => {
    const req = createMockNextRequest('http://localhost:3000/api/ai/events', {
      method: 'POST',
      body: { event_name: 'not_valid' },
    })

    const res = await POST(req)

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({ error: 'Invalid body' })
  })

  it('returns 403 when body user_id does not match session', async () => {
    const req = createMockNextRequest('http://localhost:3000/api/ai/events', {
      method: 'POST',
      body: {
        event_name: 'message_send',
        user_id: 'user-2',
        surface: 'dashboard',
        action: 'message_submit',
      },
    })

    const res = await POST(req)

    expect(res.status).toBe(403)
    await expect(res.json()).resolves.toMatchObject({ error: 'Forbidden' })
  })

  it('returns 429 when rate limited', async () => {
    consumeRateLimitMock.mockReturnValueOnce({
      success: false,
      remaining: 0,
      retryAfterSec: 30,
      limit: 90,
      resetAt: Date.now() + 30_000,
    })

    const req = createMockNextRequest('http://localhost:3000/api/ai/events', {
      method: 'POST',
      body: {
        event_name: 'chip_click',
        surface: 'dashboard',
        action: 'intent_chip_selected',
      },
    })

    const res = await POST(req)

    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('30')
    expect(res.headers.get('Server-Timing')).toContain('chimmy_ai_events')
    expect(res.headers.get('X-RateLimit-Limit')).toBeTruthy()
    expect(res.headers.get('X-RateLimit-Remaining')).toBeTruthy()
  })

  it('returns 413 when payload exceeds max content length', async () => {
    const req = createMockNextRequest('http://localhost:3000/api/ai/events', {
      method: 'POST',
      headers: {
        'content-length': '64000',
      },
      body: {
        event_name: 'message_send',
        surface: 'dashboard',
        action: 'message_submit',
      },
    })

    const res = await POST(req)

    expect(res.status).toBe(413)
    await expect(res.json()).resolves.toMatchObject({ error: 'Payload too large' })
  })

  it('returns 200 and persists valid event with authenticated user id', async () => {
    const req = createMockNextRequest('http://localhost:3000/api/ai/events', {
      method: 'POST',
      body: {
        event_name: 'message_send',
        surface: 'league',
        league_id: 'league-1',
        action: 'message_submit',
        topic: 'general',
        metadata: { messageLength: 24 },
      },
    })

    const res = await POST(req)

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({ ok: true })
    expect(res.headers.get('Server-Timing')).toContain('chimmy_ai_events')
    expect(res.headers.get('X-Chimmy-Analytics-Latency-Ms')).toBeTruthy()
    expect(res.headers.get('X-RateLimit-Limit')).toBe('90')
    expect(res.headers.get('X-RateLimit-Remaining')).toBeTruthy()
    expect(analyticsCreateMock).toHaveBeenCalledTimes(1)
    const createArg = analyticsCreateMock.mock.calls[0]?.[0] as {
      data: { userId: string; event: string; meta: Record<string, unknown> }
    }
    expect(createArg.data.userId).toBe('user-1')
    expect(createArg.data.event).toBe('message_send')
    expect(createArg.data.meta).toMatchObject({
      league_id: 'league-1',
      surface: 'league',
      action: 'message_submit',
    })
  })

  it('accepts enriched chip_click metadata payload and strips raw prompt keys', async () => {
    const req = createMockNextRequest('http://localhost:3000/api/ai/events', {
      method: 'POST',
      body: {
        event_name: 'chip_click',
        surface: 'war_room',
        mode: 'dfs_upside',
        action: 'intent_chip_selected',
        metadata: {
          chipId: 'chip-war-room-edges',
          chipLabel: 'War Room edge checks',
          chipCategory: 'war_room',
          chipRank: 0,
          promptLength: 88,
          assistantMode: 'dfs_upside',
          previousMessageId: 'msg-555',
          source: 'war_room',
          prompt: 'must be stripped by privacy sanitizer',
        },
      },
    })

    const res = await POST(req)

    expect(res.status).toBe(200)
    expect(analyticsCreateMock).toHaveBeenCalledTimes(1)
    const createArg = analyticsCreateMock.mock.calls[0]?.[0] as {
      data: { event: string; meta: { mode: string; surface: string; metadata: Record<string, unknown> } }
    }
    expect(createArg.data.event).toBe('chip_click')
    expect(createArg.data.meta.mode).toBe('dfs_upside')
    expect(createArg.data.meta.surface).toBe('war_room')
    expect(createArg.data.meta.metadata.chipId).toBe('chip-war-room-edges')
    expect(createArg.data.meta.metadata.chipCategory).toBe('war_room')
    expect(createArg.data.meta.metadata.chipRank).toBe(0)
    expect(createArg.data.meta.metadata.previousMessageId).toBe('msg-555')
    expect(createArg.data.meta.metadata.prompt).toBeUndefined()
  })

  it('strips forbidden metadata keys before persistence', async () => {
    const req = createMockNextRequest('http://localhost:3000/api/ai/events', {
      method: 'POST',
      body: {
        event_name: 'response_rendered',
        surface: 'dashboard',
        action: 'response_success',
        metadata: {
          prompt: 'do not store raw prompt',
          responseText: 'do not store raw response',
          safeField: 'keep me',
          largeField: 'x'.repeat(450),
        },
      },
    })

    const res = await POST(req)

    expect(res.status).toBe(200)
    expect(analyticsCreateMock).toHaveBeenCalledTimes(1)
    const createArg = analyticsCreateMock.mock.calls[0]?.[0] as {
      data: { meta: { metadata: Record<string, unknown> } }
    }
    const metadata = createArg.data.meta.metadata
    expect(metadata.prompt).toBeUndefined()
    expect(metadata.responseText).toBeUndefined()
    expect(metadata.safeField).toBe('keep me')
    expect(String(metadata.largeField).startsWith('x'.repeat(400))).toBe(true)
  })

  it('accepts mode_change events and preserves analytics privacy rules', async () => {
    const req = createMockNextRequest('http://localhost:3000/api/ai/events', {
      method: 'POST',
      body: {
        event_name: 'mode_change',
        surface: 'league',
        mode: 'deep_analysis',
        action: 'assistant_mode_selected',
        metadata: {
          previousMode: 'fast_take',
          prompt: 'must not persist',
          responseText: 'must not persist either',
        },
      },
    })

    const res = await POST(req)

    expect(res.status).toBe(200)
    expect(analyticsCreateMock).toHaveBeenCalledTimes(1)
    const createArg = analyticsCreateMock.mock.calls[0]?.[0] as {
      data: { event: string; meta: { mode: string; metadata: Record<string, unknown> } }
    }
    expect(createArg.data.event).toBe('mode_change')
    expect(createArg.data.meta.mode).toBe('deep_analysis')
    expect(createArg.data.meta.metadata.previousMode).toBe('fast_take')
    expect(createArg.data.meta.metadata.prompt).toBeUndefined()
    expect(createArg.data.meta.metadata.responseText).toBeUndefined()
  })

  it('accepts enriched followup_click metadata payload', async () => {
    const req = createMockNextRequest('http://localhost:3000/api/ai/events', {
      method: 'POST',
      body: {
        event_name: 'followup_click',
        surface: 'league',
        mode: 'commissioner_view',
        topic: 'trade',
        action: 'followup_prompt_selected',
        metadata: {
          promptOrigin: 'contract',
          answerType: 'trade',
          assistantMode: 'commissioner_view',
          previousMessageId: 'msg-123',
          surface: 'league',
          promptLength: 42,
          source: 'tool_hub',
          prompt: 'forbidden raw prompt should be stripped',
        },
      },
    })

    const res = await POST(req)

    expect(res.status).toBe(200)
    expect(analyticsCreateMock).toHaveBeenCalledTimes(1)
    const createArg = analyticsCreateMock.mock.calls[0]?.[0] as {
      data: { event: string; meta: { topic: string; mode: string; metadata: Record<string, unknown> } }
    }
    expect(createArg.data.event).toBe('followup_click')
    expect(createArg.data.meta.mode).toBe('commissioner_view')
    expect(createArg.data.meta.topic).toBe('trade')
    expect(createArg.data.meta.metadata.promptOrigin).toBe('contract')
    expect(createArg.data.meta.metadata.answerType).toBe('trade')
    expect(createArg.data.meta.metadata.assistantMode).toBe('commissioner_view')
    expect(createArg.data.meta.metadata.previousMessageId).toBe('msg-123')
    expect(createArg.data.meta.metadata.surface).toBe('league')
    expect(createArg.data.meta.metadata.promptLength).toBe(42)
    expect(createArg.data.meta.metadata.prompt).toBeUndefined()
  })

  it('accepts feedback_submit payload and strips raw content keys', async () => {
    const req = createMockNextRequest('http://localhost:3000/api/ai/events', {
      method: 'POST',
      body: {
        event_name: 'feedback_submit',
        surface: 'league',
        mode: 'deep_analysis',
        topic: 'waiver',
        action: 'thumbs_down',
        metadata: {
          messageId: 'msg-9',
          feedbackValue: 'unhelpful',
          assistantMode: 'deep_analysis',
          source: 'messages_ai',
          responseText: 'must be stripped',
          prompt: 'must be stripped',
        },
      },
    })

    const res = await POST(req)

    expect(res.status).toBe(200)
    expect(analyticsCreateMock).toHaveBeenCalledTimes(1)
    const createArg = analyticsCreateMock.mock.calls[0]?.[0] as {
      data: { event: string; meta: { topic: string; mode: string; metadata: Record<string, unknown> } }
    }
    expect(createArg.data.event).toBe('feedback_submit')
    expect(createArg.data.meta.mode).toBe('deep_analysis')
    expect(createArg.data.meta.topic).toBe('waiver')
    expect(createArg.data.meta.metadata.messageId).toBe('msg-9')
    expect(createArg.data.meta.metadata.feedbackValue).toBe('unhelpful')
    expect(createArg.data.meta.metadata.responseText).toBeUndefined()
    expect(createArg.data.meta.metadata.prompt).toBeUndefined()
  })
})
