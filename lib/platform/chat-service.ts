import { prisma } from '@/lib/prisma'
import type { PlatformChatMessage, PlatformChatThread } from '@/types/platform-shared'

function toIso(value: Date | string | null | undefined): string {
  if (!value) return new Date(0).toISOString()
  return new Date(value).toISOString()
}

function normalizeThread(row: any): PlatformChatThread {
  return {
    id: row.id,
    threadType: row.threadType,
    productType: row.productType,
    title: row.title || 'Chat Thread',
    lastMessageAt: toIso(row.lastMessageAt),
    unreadCount: 0,
    memberCount: Number(row?._count?.members || 0),
    context: {
      createdByUserId: row.createdByUserId || null,
    },
  }
}

async function getUnifiedThreads(appUserId: string): Promise<PlatformChatThread[] | null> {
  try {
    const rows = await (prisma as any).platformChatThreadMember.findMany({
      where: { userId: appUserId, isBlocked: false },
      include: {
        thread: {
          include: {
            _count: { select: { members: true } },
          },
        },
      },
      orderBy: { thread: { lastMessageAt: 'desc' } },
      take: 100,
    })

    return rows.map((m: any) => normalizeThread(m.thread))
  } catch {
    return null
  }
}

async function getLegacyFallbackThreads(appUserId: string): Promise<PlatformChatThread[]> {
  const [leagueMemberships, aiConversations] = await Promise.all([
    (prisma as any).bracketLeagueMember
      .findMany({
        where: { userId: appUserId },
        include: {
          league: {
            select: {
              id: true,
              name: true,
              updatedAt: true,
              _count: { select: { members: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })
      .catch(() => []),
    (prisma as any).chatConversation
      .findMany({
        where: { userId: appUserId },
        orderBy: { lastMessageAt: 'desc' },
        take: 40,
        select: {
          id: true,
          title: true,
          messageCount: true,
          lastMessageAt: true,
        },
      })
      .catch(() => []),
  ])

  const leagueThreads: PlatformChatThread[] = leagueMemberships.map((m: any) => ({
    id: `league:${m.league.id}`,
    threadType: 'league',
    productType: 'app',
    title: m.league.name || 'League Chat',
    lastMessageAt: toIso(m.league.updatedAt),
    unreadCount: 0,
    memberCount: Number(m.league?._count?.members || 0),
    context: { leagueId: m.league.id },
  }))

  const aiThreads: PlatformChatThread[] = aiConversations.map((c: any) => ({
    id: `ai:${c.id}`,
    threadType: 'ai',
    productType: 'legacy',
    title: c.title || 'AI Chat Session',
    lastMessageAt: toIso(c.lastMessageAt),
    unreadCount: 0,
    memberCount: 1,
    context: { conversationId: c.id, messageCount: Number(c.messageCount || 0) },
  }))

  return [...leagueThreads, ...aiThreads].sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
  )
}

export async function getPlatformChatThreads(appUserId: string): Promise<PlatformChatThread[]> {
  const unified = await getUnifiedThreads(appUserId)
  if (unified) return unified
  return getLegacyFallbackThreads(appUserId)
}

export async function getPlatformThreadById(appUserId: string, threadId: string): Promise<PlatformChatThread | null> {
  try {
    const member = await (prisma as any).platformChatThreadMember.findFirst({
      where: { userId: appUserId, threadId, isBlocked: false },
      include: {
        thread: {
          include: {
            _count: { select: { members: true } },
          },
        },
      },
    })
    if (!member) return null
    return normalizeThread(member.thread)
  } catch {
    return null
  }
}

export async function createPlatformThread(params: {
  creatorUserId: string
  threadType: 'dm' | 'group' | 'ai'
  productType?: 'shared' | 'app' | 'bracket' | 'legacy'
  title?: string
  memberUserIds?: string[]
}): Promise<PlatformChatThread | null> {
  const memberSet = new Set<string>([params.creatorUserId, ...((params.memberUserIds || []).filter(Boolean))])
  const members = Array.from(memberSet)

  if (params.threadType === 'dm') {
    if (members.length !== 2) return null

    try {
      const existing = await (prisma as any).platformChatThread.findFirst({
        where: {
          threadType: 'dm',
          members: {
            every: { userId: { in: members } },
          },
        },
        include: { _count: { select: { members: true } } },
      })

      if (existing && Number(existing?._count?.members || 0) === 2) {
        return normalizeThread(existing)
      }
    } catch {
    }
  }

  try {
    const created = await (prisma as any).platformChatThread.create({
      data: {
        threadType: params.threadType,
        productType: params.productType || 'shared',
        title: (params.title || '').trim() || null,
        createdByUserId: params.creatorUserId,
        members: {
          create: members.map((userId) => ({
            userId,
            role: userId === params.creatorUserId ? 'owner' : 'member',
            joinedAt: new Date(),
          })),
        },
      },
      include: { _count: { select: { members: true } } },
    })

    return normalizeThread(created)
  } catch {
    return null
  }
}

export async function getPlatformThreadMessages(
  appUserId: string,
  threadId: string,
  limit = 50,
): Promise<PlatformChatMessage[]> {
  const take = Math.max(1, Math.min(limit, 100))

  try {
    const member = await (prisma as any).platformChatThreadMember.findFirst({
      where: { threadId, userId: appUserId, isBlocked: false },
      select: { id: true },
    })

    if (!member) return []

    const rows = await (prisma as any).platformChatMessage.findMany({
      where: { threadId },
      include: {
        sender: { select: { id: true, displayName: true, username: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take,
    })

    return rows.reverse().map((msg: any) => ({
      id: msg.id,
      threadId,
      senderUserId: msg.senderUserId || null,
      senderName: msg.sender?.displayName || msg.sender?.username || msg.sender?.email || 'User',
      messageType: msg.messageType || 'text',
      body: msg.body || '',
      createdAt: toIso(msg.createdAt),
      metadata: msg.metadata || undefined,
    }))
  } catch {
    return []
  }
}

export async function createPlatformThreadMessage(
  appUserId: string,
  threadId: string,
  body: string,
  messageType = 'text',
): Promise<PlatformChatMessage | null> {
  const content = String(body || '').trim()
  if (!content) return null

  try {
    const member = await (prisma as any).platformChatThreadMember.findFirst({
      where: { threadId, userId: appUserId, isBlocked: false },
      include: { thread: { select: { id: true } } },
    })

    if (!member?.thread?.id) return null

    const created = await (prisma as any).$transaction(async (tx: any) => {
      const msg = await tx.platformChatMessage.create({
        data: {
          threadId,
          senderUserId: appUserId,
          messageType,
          body: content,
        },
        include: {
          sender: { select: { id: true, displayName: true, username: true, email: true } },
        },
      })

      await tx.platformChatThread.update({
        where: { id: threadId },
        data: { lastMessageAt: new Date() },
      })

      await tx.platformChatThreadMember.updateMany({
        where: { threadId, userId: appUserId },
        data: { lastReadAt: new Date() },
      })

      return msg
    })

    return {
      id: created.id,
      threadId,
      senderUserId: created.senderUserId || null,
      senderName: created.sender?.displayName || created.sender?.username || created.sender?.email || 'User',
      messageType: created.messageType || 'text',
      body: created.body || '',
      createdAt: toIso(created.createdAt),
      metadata: created.metadata || undefined,
    }
  } catch {
    return null
  }
}
