import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/queues/bullmq', () => ({
  redis: null,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    aIMemoryEvent: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}))

import {
  buildWorkingMemoryPrompt,
  getCurrentTags,
  type MemoryEntry,
  type WorkingMemory,
} from '@/lib/ai/working-memory'

function makeMemory(entries: Partial<MemoryEntry>[]): WorkingMemory {
  return {
    sessionId: 'test-session',
    userId: 'test-user',
    compressionGen: 0,
    tokenEstimate: 100,
    updatedAt: Date.now(),
    entries: entries.map((entry, index) => ({
      id: `entry-${index}`,
      type: 'ai-response' as const,
      content: entry.content ?? 'test content',
      importance: entry.importance ?? 0.5,
      timestamp: entry.timestamp ?? Date.now() - index * 60000,
      compressed: entry.compressed ?? false,
      tags: entry.tags ?? [],
      ...entry,
    })),
  }
}

describe('buildWorkingMemoryPrompt', () => {
  it('returns empty blocks for empty memory', () => {
    const result = buildWorkingMemoryPrompt(makeMemory([]))
    expect(result.contextBlock).toBe('')
    expect(result.tokenCount).toBe(0)
  })

  it('includes entries in output', () => {
    const mem = makeMemory([{ content: 'Start Nico Collins this week' }])
    const result = buildWorkingMemoryPrompt(mem)
    expect(result.contextBlock).toContain('Nico Collins')
  })

  it('respects token target', () => {
    const bigMem = makeMemory(
      Array.from({ length: 30 }, (_, index) => ({
        content: 'x'.repeat(300),
        timestamp: Date.now() - index * 1000,
      }))
    )
    const result = buildWorkingMemoryPrompt(bigMem)
    expect(result.tokenCount).toBeLessThanOrEqual(1600)
  })

  it('boosts entries with matching tags', () => {
    const mem = makeMemory([
      {
        content: 'trade advice given',
        tags: ['trade'],
        importance: 0.3,
        timestamp: Date.now() - 10000,
      },
      {
        content: 'general chat',
        tags: [],
        importance: 0.9,
        timestamp: Date.now() - 1000,
      },
    ])
    const result = buildWorkingMemoryPrompt(mem, ['trade'])
    expect(result.contextBlock).toContain('trade advice given')
  })
})

describe('getCurrentTags', () => {
  it('returns tags from recent entries', () => {
    const mem = makeMemory([
      { tags: ['trade', 'WR'], timestamp: Date.now() - 1000 },
      { tags: ['waiver', 'RB'], timestamp: Date.now() - 2000 },
    ])
    const tags = getCurrentTags(mem)
    expect(tags).toContain('trade')
    expect(tags).toContain('waiver')
  })
})
