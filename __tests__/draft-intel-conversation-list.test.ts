import { describe, expect, it } from 'vitest'

import {
  getConversationDisplayTitle,
  getDMThreads,
} from '@/lib/conversations/ConversationListResolver'

describe('draft intel conversation list behavior', () => {
  it('surfaces Chimmy draft intel threads inside the DM list', () => {
    const threads = [
      {
        id: 'thread-1',
        threadType: 'ai',
        productType: 'app',
        title: 'Chimmy Draft Intel - League One',
        lastMessageAt: '2026-03-30T00:00:00.000Z',
        unreadCount: 1,
        memberCount: 1,
        context: { showInDmList: true, verifiedBadge: true },
      },
      {
        id: 'thread-2',
        threadType: 'group',
        productType: 'app',
        title: 'League Chat',
        lastMessageAt: '2026-03-30T00:00:00.000Z',
        unreadCount: 0,
        memberCount: 3,
        context: {},
      },
    ] as any

    const dmThreads = getDMThreads(threads)
    expect(dmThreads).toHaveLength(1)
    expect(dmThreads[0].id).toBe('thread-1')
    expect(getConversationDisplayTitle(dmThreads[0])).toBe('Chimmy Draft Intel - League One')
  })
})
