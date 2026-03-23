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
        sender: {
          select: {
            id: true,
            displayName: true,
            username: true,
            email: true,
            avatarUrl: true,
            profile: { select: { avatarPreset: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take,
    })

    const visible = rows.filter((r: any) => !(r.metadata as Record<string, unknown>)?.hiddenByMod)
    return visible.reverse().map((msg: any) => ({
      id: msg.id,
      threadId,
      senderUserId: msg.senderUserId || null,
      senderName: msg.sender?.displayName || msg.sender?.username || msg.sender?.email || 'User',
      senderAvatarUrl: msg.sender?.avatarUrl ?? null,
      senderAvatarPreset: msg.sender?.profile?.avatarPreset ?? null,
      messageType: msg.messageType || 'text',
      body: msg.body || '',
      createdAt: toIso(msg.createdAt),
      metadata: msg.metadata || undefined,
    }))
  } catch {
    return []
  }
}

/** Soft-hide a message for moderation (commissioner). */
export async function setMessageHiddenByMod(
  threadId: string,
  messageId: string,
  hidden: boolean,
): Promise<boolean> {
  try {
    const msg = await (prisma as any).platformChatMessage.findFirst({
      where: { id: messageId, threadId },
      select: { id: true, metadata: true },
    })
    if (!msg) return false
    const meta = (msg.metadata as Record<string, unknown>) || {}
    await (prisma as any).platformChatMessage.update({
      where: { id: messageId },
      data: { metadata: { ...meta, hiddenByMod: hidden }, updatedAt: new Date() },
    })
    return true
  } catch {
    return false
  }
}

export async function createPlatformThreadMessage(
  appUserId: string,
  threadId: string,
  body: string,
  messageType = 'text',
  metadata?: Record<string, unknown> | null,
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
          metadata: metadata ?? undefined,
        },
        include: {
          sender: {
            select: {
              id: true,
              displayName: true,
              username: true,
              email: true,
              avatarUrl: true,
              profile: { select: { avatarPreset: true } },
            },
          },
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
      senderAvatarUrl: created.sender?.avatarUrl ?? null,
      senderAvatarPreset: created.sender?.profile?.avatarPreset ?? null,
      messageType: created.messageType || 'text',
      body: created.body || '',
      createdAt: toIso(created.createdAt),
      metadata: created.metadata || undefined,
    }
  } catch {
    return null
  }
}

export async function createPlatformThreadTypedMessage(
  appUserId: string,
  threadId: string,
  messageType: string,
  payload: unknown,
  metadata?: Record<string, unknown> | null,
): Promise<PlatformChatMessage | null> {
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload)
  return createPlatformThreadMessage(appUserId, threadId, body, messageType, metadata)
}

export async function addReactionToMessage(
  appUserId: string,
  threadId: string,
  messageId: string,
  emoji: string,
): Promise<boolean> {
  const emojiTrim = String(emoji || '').trim().slice(0, 10)
  if (!emojiTrim) return false
  try {
    const member = await (prisma as any).platformChatThreadMember.findFirst({
      where: { threadId, userId: appUserId, isBlocked: false },
      select: { id: true },
    })
    if (!member) return false

    const msg = await (prisma as any).platformChatMessage.findFirst({
      where: { id: messageId, threadId },
      select: { id: true, metadata: true },
    })
    if (!msg) return false

    const meta = (msg.metadata as Record<string, unknown> | null) || {}
    const reactions: Array<{ emoji: string; count: number; userIds?: string[] }> = Array.isArray(meta.reactions)
      ? (meta.reactions as Array<{ emoji: string; count: number; userIds?: string[] }>)
      : []
    let found = false
    for (const r of reactions) {
      if (r.emoji === emojiTrim) {
        const ids = Array.isArray(r.userIds) ? r.userIds : []
        if (!ids.includes(appUserId)) {
          ids.push(appUserId)
          r.count = ids.length
          r.userIds = ids
        }
        found = true
        break
      }
    }
    if (!found) reactions.push({ emoji: emojiTrim, count: 1, userIds: [appUserId] })

    await (prisma as any).platformChatMessage.update({
      where: { id: messageId },
      data: { metadata: { ...meta, reactions }, updatedAt: new Date() },
    })
    return true
  } catch {
    return false
  }
}

export async function removeReactionFromMessage(
  appUserId: string,
  threadId: string,
  messageId: string,
  emoji: string,
): Promise<boolean> {
  const emojiTrim = String(emoji || '').trim().slice(0, 10)
  if (!emojiTrim) return false
  try {
    const member = await (prisma as any).platformChatThreadMember.findFirst({
      where: { threadId, userId: appUserId, isBlocked: false },
      select: { id: true },
    })
    if (!member) return false

    const msg = await (prisma as any).platformChatMessage.findFirst({
      where: { id: messageId, threadId },
      select: { id: true, metadata: true },
    })
    if (!msg) return false

    const meta = (msg.metadata as Record<string, unknown> | null) || {}
    let reactions: Array<{ emoji: string; count: number; userIds?: string[] }> = Array.isArray(meta.reactions)
      ? (meta.reactions as Array<{ emoji: string; count: number; userIds?: string[] }>)
      : []
    reactions = reactions
      .map((r) => {
        if (r.emoji !== emojiTrim) return r
        const ids = Array.isArray(r.userIds) ? r.userIds.filter((id) => id !== appUserId) : []
        if (ids.length === 0) return null
        return { ...r, userIds: ids, count: ids.length }
      })
      .filter((r): r is { emoji: string; count: number; userIds?: string[] } => r !== null)

    await (prisma as any).platformChatMessage.update({
      where: { id: messageId },
      data: { metadata: { ...meta, reactions }, updatedAt: new Date() },
    })
    return true
  } catch {
    return false
  }
}

/**
 * Create a system message (no sender). Used for waiver_bot, broadcast, etc. Internal/cron only.
 */
export async function createSystemMessage(
  threadId: string,
  messageType: string,
  body: string,
): Promise<PlatformChatMessage | null> {
  const content = String(body || '').trim()
  if (!content) return null
  try {
    const created = await (prisma as any).platformChatMessage.create({
      data: {
        threadId,
        senderUserId: null,
        messageType: messageType || 'text',
        body: content,
      },
    })
    await (prisma as any).platformChatThread.update({
      where: { id: threadId },
      data: { lastMessageAt: new Date() },
    })
    return {
      id: created.id,
      threadId,
      senderUserId: null,
      senderName: 'System',
      messageType: created.messageType || 'text',
      body: created.body || '',
      createdAt: toIso(created.createdAt),
      metadata: created.metadata || undefined,
    }
  } catch {
    return null
  }
}

/**
 * Record a poll vote. One vote per user; voting again overwrites.
 * Body must be JSON { question, options, votes?: { [optionIndex]: userId[] } }.
 */
export async function votePollMessage(
  appUserId: string,
  threadId: string,
  messageId: string,
  optionIndex: number,
): Promise<boolean> {
  try {
    const member = await (prisma as any).platformChatThreadMember.findFirst({
      where: { threadId, userId: appUserId, isBlocked: false },
      select: { id: true },
    })
    if (!member) return false

    const msg = await (prisma as any).platformChatMessage.findFirst({
      where: { id: messageId, threadId, messageType: 'poll' },
      select: { id: true, body: true },
    })
    if (!msg?.body) return false

    let payload: { question?: string; options?: string[]; votes?: Record<string, string[]> } = {}
    try {
      payload = typeof msg.body === 'string' ? JSON.parse(msg.body) : msg.body
    } catch {
      return false
    }
    const options = Array.isArray(payload.options) ? payload.options : []
    if (optionIndex < 0 || optionIndex >= options.length) return false

    const votes: Record<string, string[]> = typeof payload.votes === 'object' && payload.votes !== null
      ? { ...payload.votes }
      : {}
    const key = String(optionIndex)
    for (const k of Object.keys(votes)) {
      votes[k] = (votes[k] || []).filter((id) => id !== appUserId)
    }
    if (!votes[key]) votes[key] = []
    if (!votes[key].includes(appUserId)) votes[key].push(appUserId)

    const newBody = JSON.stringify({ ...payload, votes })
    await (prisma as any).platformChatMessage.update({
      where: { id: messageId },
      data: { body: newBody, updatedAt: new Date() },
    })
    return true
  } catch {
    return false
  }
}

/**
 * Close (resolve) a poll so no more votes can be cast. Caller must be thread member.
 */
export async function closePollMessage(
  appUserId: string,
  threadId: string,
  messageId: string,
): Promise<boolean> {
  try {
    const member = await (prisma as any).platformChatThreadMember.findFirst({
      where: { threadId, userId: appUserId, isBlocked: false },
      select: { id: true },
    })
    if (!member) return false

    const msg = await (prisma as any).platformChatMessage.findFirst({
      where: { id: messageId, threadId, messageType: 'poll' },
      select: { id: true, body: true },
    })
    if (!msg?.body) return false

    let payload: Record<string, unknown> = {}
    try {
      payload = typeof msg.body === 'string' ? JSON.parse(msg.body) : msg.body
    } catch {
      return false
    }
    const newBody = JSON.stringify({ ...payload, closed: true })
    await (prisma as any).platformChatMessage.update({
      where: { id: messageId },
      data: { body: newBody, updatedAt: new Date() },
    })
    return true
  } catch {
    return false
  }
}

/**
 * Delete a pin-type message (unpin). Caller must be thread member. Only messageType 'pin' can be deleted.
 */
export async function deletePinMessage(
  appUserId: string,
  threadId: string,
  pinMessageId: string,
): Promise<boolean> {
  try {
    const member = await (prisma as any).platformChatThreadMember.findFirst({
      where: { threadId, userId: appUserId, isBlocked: false },
      select: { id: true },
    })
    if (!member) return false
    const msg = await (prisma as any).platformChatMessage.findFirst({
      where: { id: pinMessageId, threadId, messageType: 'pin' },
      select: { id: true },
    })
    if (!msg) return false
    await (prisma as any).platformChatMessage.delete({
      where: { id: pinMessageId },
    })
    return true
  } catch {
    return false
  }
}

/**
 * Leave a thread (remove membership). Returns true if left.
 */
export async function leaveThread(appUserId: string, threadId: string): Promise<boolean> {
  try {
    const member = await (prisma as any).platformChatThreadMember.findFirst({
      where: { threadId, userId: appUserId },
      select: { id: true },
    })
    if (!member) return false
    await (prisma as any).platformChatThreadMember.delete({
      where: { id: member.id },
    })
    return true
  } catch {
    return false
  }
}

/**
 * Get thread members for mention suggestions. Caller must be a member. Returns id, username, displayName.
 */
export async function getThreadMembers(
  appUserId: string,
  threadId: string,
): Promise<Array<{ id: string; username: string; displayName: string | null }>> {
  try {
    const myMember = await prisma.platformChatThreadMember.findFirst({
      where: { threadId, userId: appUserId, isBlocked: false },
      select: { id: true },
    })
    if (!myMember) return []

    const rows = await prisma.platformChatThreadMember.findMany({
      where: { threadId, isBlocked: false },
      include: {
        user: { select: { id: true, username: true, displayName: true } },
      },
    })
    return rows
      .filter((m) => m.user?.id)
      .map((m) => ({
        id: m.user!.id,
        username: m.user!.username || m.user!.id,
        displayName: m.user!.displayName ?? null,
      }))
  } catch {
    return []
  }
}

/**
 * Update thread title (rename). Caller must be member. Only group threads typically allow rename.
 */
export async function updateThreadTitle(
  appUserId: string,
  threadId: string,
  title: string,
): Promise<boolean> {
  try {
    const member = await (prisma as any).platformChatThreadMember.findFirst({
      where: { threadId, userId: appUserId, isBlocked: false },
      select: { id: true },
    })
    if (!member) return false
    await (prisma as any).platformChatThread.update({
      where: { id: threadId },
      data: { title: title.trim().slice(0, 100) || null, updatedAt: new Date() },
    })
    return true
  } catch {
    return false
  }
}

/**
 * Create a system stats_bot message (no sender). Call from cron or internal only.
 */
export async function createStatsBotMessage(
  threadId: string,
  payload: {
    weekLabel: string
    bestTeam: string
    worstTeam: string
    bestPlayer: string
    winStreak: string
    lossStreak: string
  },
): Promise<PlatformChatMessage | null> {
  const body = JSON.stringify(payload)
  try {
    const created = await (prisma as any).platformChatMessage.create({
      data: {
        threadId,
        senderUserId: null,
        messageType: 'stats_bot',
        body,
      },
    })
    await (prisma as any).platformChatThread.update({
      where: { id: threadId },
      data: { lastMessageAt: new Date() },
    })
    return {
      id: created.id,
      threadId,
      senderUserId: null,
      senderName: 'Chat Stats Bot',
      messageType: 'stats_bot',
      body: created.body || '',
      createdAt: toIso(created.createdAt),
      metadata: created.metadata || undefined,
    }
  } catch {
    return null
  }
}

export async function blockUserInSharedThreads(
  requesterUserId: string,
  blockedUserId: string,
): Promise<number> {
  if (!requesterUserId || !blockedUserId || requesterUserId === blockedUserId) return 0

  try {
    const shared = await (prisma as any).platformChatThread.findMany({
      where: {
        members: {
          some: { userId: requesterUserId },
        },
        AND: [
          {
            members: {
              some: { userId: blockedUserId },
            },
          },
        ],
      },
      select: { id: true },
      take: 200,
    })

    if (!shared.length) return 0
    const threadIds = shared.map((t: { id: string }) => t.id)

    const result = await (prisma as any).platformChatThreadMember.updateMany({
      where: {
        threadId: { in: threadIds },
        userId: blockedUserId,
      },
      data: { isBlocked: true },
    })

    return Number(result?.count || 0)
  } catch {
    return 0
  }
}

export async function unblockUserInSharedThreads(
  requesterUserId: string,
  blockedUserId: string,
): Promise<number> {
  if (!requesterUserId || !blockedUserId || requesterUserId === blockedUserId) return 0

  try {
    const shared = await (prisma as any).platformChatThread.findMany({
      where: {
        members: {
          some: { userId: requesterUserId },
        },
        AND: [
          {
            members: {
              some: { userId: blockedUserId },
            },
          },
        ],
      },
      select: { id: true },
      take: 200,
    })

    if (!shared.length) return 0
    const threadIds = shared.map((t: { id: string }) => t.id)

    const result = await (prisma as any).platformChatThreadMember.updateMany({
      where: {
        threadId: { in: threadIds },
        userId: blockedUserId,
      },
      data: { isBlocked: false },
    })

    return Number(result?.count || 0)
  } catch {
    return 0
  }
}

export async function setThreadMuted(
  appUserId: string,
  threadId: string,
  muted: boolean,
): Promise<boolean> {
  try {
    const result = await (prisma as any).platformChatThreadMember.updateMany({
      where: { threadId, userId: appUserId },
      data: { isMuted: muted },
    })
    return Number(result?.count ?? 0) > 0
  } catch {
    return false
  }
}

export async function getBlockedUsers(requesterUserId: string): Promise<Array<{ userId: string; username: string | null; displayName: string | null }>> {
  if (!requesterUserId) return []

  try {
    const members = await (prisma as any).platformChatThreadMember.findMany({
      where: {
        isBlocked: true,
        thread: {
          members: {
            some: { userId: requesterUserId },
          },
        },
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
      take: 500,
    })

    const dedup = new Map<string, { userId: string; username: string | null; displayName: string | null }>()
    for (const member of members) {
      if (!member?.user?.id || member.user.id === requesterUserId) continue
      dedup.set(member.user.id, {
        userId: member.user.id,
        username: member.user.username || null,
        displayName: member.user.displayName || null,
      })
    }

    return Array.from(dedup.values())
  } catch {
    return []
  }
}
