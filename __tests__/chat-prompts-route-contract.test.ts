import { beforeEach, describe, expect, it, vi } from 'vitest'

const resolvePlatformUserMock = vi.fn()
const dispatchNotificationMock = vi.fn()
const getLeagueMemberUserIdsMock = vi.fn()
const createLeagueChatMessageMock = vi.fn()

const prismaMock = {
  leagueChatMessage: { findFirst: vi.fn() },
  bracketLeagueMember: { findUnique: vi.fn(), findMany: vi.fn() },
  platformChatThreadMember: { findMany: vi.fn() },
  appUser: { findUnique: vi.fn(), findMany: vi.fn() },
}

vi.mock('@/lib/platform/current-user', () => ({
  resolvePlatformUser: resolvePlatformUserMock,
}))

vi.mock('@/lib/notifications/NotificationDispatcher', () => ({
  dispatchNotification: dispatchNotificationMock,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}))

vi.mock('@/lib/league-chat/leagueMemberIds', () => ({
  getLeagueMemberUserIds: getLeagueMemberUserIdsMock,
}))

vi.mock('@/lib/chat-core', () => ({
  isLeagueVirtualRoom: (threadId: string) => threadId.startsWith('league:'),
  getLeagueIdFromVirtualRoom: (threadId: string) => threadId.replace(/^league:/, ''),
  getMessageQueryOptions: () => ({}),
  parseCursor: () => null,
}))

vi.mock('@/lib/platform/chat-service', () => ({
  createPlatformThreadMessage: vi.fn(),
  createSystemMessage: vi.fn(),
  getPlatformThreadMessages: vi.fn(),
}))

vi.mock('@/lib/chat-core/league-message-proxy', () => ({
  bracketMessagesToPlatform: vi.fn(),
}))

vi.mock('@/lib/live-draft-engine/auth', () => ({
  canAccessLeagueDraft: vi.fn(async () => true),
  getCurrentUserRosterIdForLeague: vi.fn(async () => null),
}))

vi.mock('@/lib/survivor/constants', () => ({
  parseTribeIdFromSource: vi.fn(() => null),
}))

vi.mock('@/lib/survivor/SurvivorChatMembershipService', () => ({
  getTribeChatMemberRosterIds: vi.fn(async () => []),
}))

vi.mock('@/lib/survivor/SurvivorOfficialCommandService', () => ({
  processSurvivorOfficialCommand: vi.fn(async () => ({ handled: false })),
}))

vi.mock('@/lib/survivor/SurvivorTimelineResolver', () => ({
  resolveSurvivorCurrentWeek: vi.fn(async () => 1),
}))

vi.mock('@/lib/survivor/SurvivorMergeEngine', () => ({
  isMergeTriggered: vi.fn(async () => false),
}))

vi.mock('@/lib/moderation', () => ({
  getBlockedUserIds: vi.fn(async () => []),
  filterMessagesByBlocked: vi.fn((messages: unknown[]) => messages),
}))

vi.mock('@/lib/draft-intelligence', () => ({
  publishDraftIntelState: vi.fn(async () => null),
}))

vi.mock('@/lib/league-chat/LeagueChatMessageService', () => ({
  getLeagueChatMessages: vi.fn(async () => []),
  createLeagueChatMessage: createLeagueChatMessageMock,
}))

describe('chat prompt contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resolvePlatformUserMock.mockResolvedValue({ appUserId: 'u1' })
    prismaMock.leagueChatMessage.findFirst.mockResolvedValue({ id: 'm1' })
    prismaMock.appUser.findUnique.mockResolvedValue({ displayName: 'Sender', username: 'sender' })
    prismaMock.appUser.findMany.mockResolvedValue([{ id: 'u2' }])
    prismaMock.bracketLeagueMember.findUnique.mockResolvedValue(null)
    prismaMock.bracketLeagueMember.findMany.mockResolvedValue([])
    prismaMock.platformChatThreadMember.findMany.mockResolvedValue([
      { userId: 'u1' },
      { userId: 'u3' },
      { userId: 'u4' },
    ])
    getLeagueMemberUserIdsMock.mockResolvedValue(['u1', 'u3', 'u4'])
    createLeagueChatMessageMock.mockResolvedValue({ id: 'created-1', body: 'help', threadId: 'league:l1' })
  })

  it('@username and @all fan-out while skipping @global and @chimmy control tokens', async () => {
    const { POST } = await import('../app/api/shared/chat/mentions/route')

    const req = new Request('http://localhost/api/shared/chat/mentions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        threadId: 'league:l1',
        messageId: 'm1',
        mentionedUsernames: ['alice', 'all', 'global', 'chimmy'],
      }),
    })

    const res = await POST(req as any)
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({ status: 'ok' })

    expect(dispatchNotificationMock).toHaveBeenCalledTimes(1)
    const payload = dispatchNotificationMock.mock.calls[0][0] as { userIds: string[] }
    expect(payload.userIds.sort()).toEqual(['u2', 'u3', 'u4'])
  })

  it('@chimmy in shared thread POST is routed to private chimmy prompt message', async () => {
    const { POST } = await import('../app/api/shared/chat/threads/[threadId]/messages/route')

    const req = new Request('http://localhost/api/shared/chat/threads/league:l1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ body: '@chimmy help me set lineup' }),
    })

    const res = await POST(req as any, { params: { threadId: 'league:l1' } } as any)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json?.commandResult?.intent).toBe('chimmy_prompt')
    expect(createLeagueChatMessageMock).toHaveBeenCalledWith(
      'l1',
      'u1',
      'help me set lineup',
      expect.objectContaining({
        isPrivate: true,
        visibleToUserId: 'u1',
        messageSubtype: 'chimmy_prompt',
      })
    )
  })

  it('@global remains a broadcast control token (not direct mention target)', async () => {
    const { POST } = await import('../app/api/shared/chat/mentions/route')

    const req = new Request('http://localhost/api/shared/chat/mentions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        threadId: 'league:l1',
        messageId: 'm1',
        mentionedUsernames: ['global'],
      }),
    })

    const res = await POST(req as any)
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({ status: 'ok', notified: 0 })
    expect(dispatchNotificationMock).not.toHaveBeenCalled()
  })
})
