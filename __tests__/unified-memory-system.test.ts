import { describe, it, expect, vi, beforeEach } from 'vitest'

const { listAiMemoryByUser, upsertAiMemory, createMemoryEvent } = vi.hoisted(() => ({
  listAiMemoryByUser: vi.fn(),
  upsertAiMemory: vi.fn(),
  createMemoryEvent: vi.fn(),
}))

vi.mock('@/lib/ai-memory/ai-memory-store', () => ({
  listAiMemoryByUser,
  upsertAiMemory,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    aIMemoryEvent: {
      create: createMemoryEvent,
    },
  },
}))

import {
  buildUnifiedMemoryPromptSection,
  getUnifiedMemoryRecords,
  upsertUnifiedMemoryFact,
} from '../lib/ai-memory/unified-memory-system'

beforeEach(() => {
  listAiMemoryByUser.mockReset()
  upsertAiMemory.mockReset()
  createMemoryEvent.mockReset()
  createMemoryEvent.mockResolvedValue({ id: 'evt-1' })
})

describe('upsertUnifiedMemoryFact', () => {
  it('blocks sensitive memory content', async () => {
    await upsertUnifiedMemoryFact({
      userId: 'u1',
      scope: 'personal',
      category: 'chat_context',
      content: 'The user shared political views in chat',
      confidence: 0.9,
      source: 'chat',
    })

    expect(upsertAiMemory).not.toHaveBeenCalled()
    expect(createMemoryEvent).not.toHaveBeenCalled()
  })

  it('writes normalized scoped memory and event', async () => {
    await upsertUnifiedMemoryFact({
      userId: 'u1',
      leagueId: 'l1',
      teamId: 't1',
      scope: 'team',
      category: 'action_outcome',
      content: '  Start recommendation accepted successfully  ',
      confidence: 1.4,
      source: 'actions',
      sport: 'NFL',
    })

    expect(upsertAiMemory).toHaveBeenCalledTimes(1)
    expect(createMemoryEvent).toHaveBeenCalledTimes(1)
    const call = upsertAiMemory.mock.calls[0][0] as Record<string, unknown>
    expect(call.scope).toBe('coaching_notes')
    expect(String(call.key)).toContain('um:team:t1:action_outcome:actions')
  })
})

describe('buildUnifiedMemoryPromptSection', () => {
  it('applies strict team and role filters', async () => {
    listAiMemoryByUser.mockResolvedValue([
      {
        scope: 'coaching_notes',
        key: 'um:team:team-a:chat_context:chat',
        value: {
          scope: 'team',
          category: 'chat_context',
          content: 'Team A context',
          confidence: 0.8,
          source: 'chat',
          teamId: 'team-a',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      },
      {
        scope: 'coaching_notes',
        key: 'um:team:team-b:chat_context:chat',
        value: {
          scope: 'team',
          category: 'chat_context',
          content: 'Team B context',
          confidence: 0.8,
          source: 'chat',
          teamId: 'team-b',
          updatedAt: '2026-01-02T00:00:00.000Z',
        },
      },
      {
        scope: 'coaching_notes',
        key: 'um:platform:global:commissioner_behavior:commissioner',
        value: {
          scope: 'platform',
          category: 'commissioner_behavior',
          content: 'Commissioner-only behavior',
          confidence: 0.9,
          source: 'commissioner',
          updatedAt: '2026-01-03T00:00:00.000Z',
        },
      },
    ])

    const section = await buildUnifiedMemoryPromptSection({
      userId: 'u1',
      role: 'member',
      leagueId: 'l1',
      teamId: 'team-a',
    })

    expect(section).toContain('Team A context')
    expect(section).not.toContain('Team B context')
    expect(section).not.toContain('Commissioner-only behavior')
  })

  it('omits platform scope when includePlatform is false', async () => {
    listAiMemoryByUser.mockResolvedValue([
      {
        scope: 'coaching_notes',
        key: 'um:platform:global:chat_context:chat',
        value: {
          scope: 'platform',
          category: 'chat_context',
          content: 'Platform context',
          confidence: 0.8,
          source: 'chat',
          updatedAt: '2026-01-04T00:00:00.000Z',
        },
      },
      {
        scope: 'user_preferences',
        key: 'um:personal:global:strategy_preference:chat',
        value: {
          scope: 'personal',
          category: 'strategy_preference',
          content: 'Personal strategy context',
          confidence: 0.8,
          source: 'chat',
          updatedAt: '2026-01-05T00:00:00.000Z',
        },
      },
    ])

    const records = await getUnifiedMemoryRecords({
      userId: 'u1',
      role: 'member',
      includePlatform: false,
    })

    expect(records.some((row) => row.scope === 'platform')).toBe(false)
    expect(records.some((row) => row.scope === 'personal')).toBe(true)
  })
})
