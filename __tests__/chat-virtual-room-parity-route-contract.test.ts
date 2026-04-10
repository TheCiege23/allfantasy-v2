import { beforeEach, describe, expect, it, vi } from 'vitest'

const resolvePlatformUserMock = vi.fn()
const canAccessLeagueDraftMock = vi.fn()

const prismaMock = {
  bracketLeagueMember: { findUnique: vi.fn() },
  leagueChatMessage: { findUnique: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
  bracketLeagueMessage: { findUnique: vi.fn(), deleteMany: vi.fn() },
  bracketMessageReaction: { findUnique: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
}

vi.mock('@/lib/platform/current-user', () => ({
  resolvePlatformUser: resolvePlatformUserMock,
}))

vi.mock('@/lib/live-draft-engine/auth', () => ({
  canAccessLeagueDraft: canAccessLeagueDraftMock,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}))

vi.mock('@/lib/chat-core', () => ({
  isLeagueVirtualRoom: (threadId: string) => threadId.startsWith('league:'),
  getLeagueIdFromVirtualRoom: (threadId: string) => threadId.replace(/^league:/, ''),
}))

vi.mock('@/lib/platform/chat-service', () => ({
  addReactionToMessage: vi.fn(),
  removeReactionFromMessage: vi.fn(),
  deletePinMessage: vi.fn(),
}))

describe('virtual room parity route contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resolvePlatformUserMock.mockResolvedValue({ appUserId: 'u1' })
    prismaMock.bracketLeagueMember.findUnique.mockResolvedValue(null)
    canAccessLeagueDraftMock.mockResolvedValue(true)
    prismaMock.leagueChatMessage.deleteMany.mockResolvedValue({ count: 1 })
    prismaMock.leagueChatMessage.update.mockResolvedValue({ id: 'm1' })
  })

  it('allows unpin for main league virtual rooms', async () => {
    const { POST } = await import('../app/api/shared/chat/threads/[threadId]/unpin/route')

    const req = new Request('http://localhost/api/shared/chat/threads/league:l1/unpin', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ pinMessageId: 'pin-1' }),
    })

    const res = await POST(req as any, { params: { threadId: 'league:l1' } } as any)
    expect(res.status).toBe(200)
    expect(prismaMock.leagueChatMessage.deleteMany).toHaveBeenCalledWith({
      where: { id: 'pin-1', leagueId: 'l1', type: 'pin' },
    })
  })

  it('adds and removes reactions for main league virtual rooms', async () => {
    const { POST, DELETE } = await import(
      '../app/api/shared/chat/threads/[threadId]/messages/[messageId]/reactions/route'
    )

    prismaMock.leagueChatMessage.findUnique.mockResolvedValueOnce({
      id: 'm1',
      leagueId: 'l1',
      metadata: {},
    })

    const addReq = new Request('http://localhost/api/shared/chat/threads/league:l1/messages/m1/reactions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ emoji: '👍' }),
    })
    const addRes = await POST(addReq as any, { params: { threadId: 'league:l1', messageId: 'm1' } } as any)
    expect(addRes.status).toBe(200)
    expect(prismaMock.leagueChatMessage.update).toHaveBeenCalledWith({
      where: { id: 'm1' },
      data: {
        metadata: {
          reactions: [{ emoji: '👍', count: 1, userIds: ['u1'] }],
        },
      },
    })

    prismaMock.leagueChatMessage.findUnique.mockResolvedValueOnce({
      id: 'm1',
      leagueId: 'l1',
      metadata: { reactions: [{ emoji: '👍', count: 1, userIds: ['u1'] }] },
    })

    const removeReq = new Request('http://localhost/api/shared/chat/threads/league:l1/messages/m1/reactions', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ emoji: '👍' }),
    })
    const removeRes = await DELETE(removeReq as any, {
      params: { threadId: 'league:l1', messageId: 'm1' },
    } as any)
    expect(removeRes.status).toBe(200)
    expect(prismaMock.leagueChatMessage.update).toHaveBeenLastCalledWith({
      where: { id: 'm1' },
      data: {
        metadata: {
          reactions: [],
        },
      },
    })
  })
})
