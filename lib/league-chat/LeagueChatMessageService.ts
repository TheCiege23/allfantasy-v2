/**
 * League chat messages for main app League (LeagueChatMessage).
 * Used by shared chat when threadId = league:leagueId and league is main League (not BracketLeague).
 */

import { prisma } from '@/lib/prisma'
import type { PlatformChatMessage } from '@/types/platform-shared'

const includeUser = {
  user: {
    select: {
      id: true,
      username: true,
      displayName: true,
      email: true,
      avatarUrl: true,
      profile: { select: { avatarPreset: true } },
    },
  },
}

export async function getLeagueChatMessages(
  leagueId: string,
  options: { limit?: number; before?: Date; source?: string | null; /** when undefined, league channel = exclude draft-only + tribe-only */ }
): Promise<PlatformChatMessage[]> {
  const limit = Math.min(options.limit ?? 50, 100)
  const where: Record<string, unknown> = { leagueId }
  if (typeof options.source === 'string' && options.source.trim()) {
    where.source = options.source.trim()
  } else if (options.source === null) {
    where.source = null
  } else if (options.source === undefined) {
    where.NOT = [{ source: 'draft' }, { source: { startsWith: 'tribe_' } }]
  }
  const rows = await prisma.leagueChatMessage.findMany({
    where: {
      ...where,
      ...(options.before ? { createdAt: { lt: options.before } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: includeUser,
  })
  return rows.reverse().map((m) => {
    const rawMeta = ((m as { metadata?: Record<string, unknown> }).metadata ?? null) as Record<
      string,
      unknown
    > | null
    const discordAuthorName =
      typeof rawMeta?.discordAuthorName === 'string' ? rawMeta.discordAuthorName : null
    const discordAuthorAvatarUrl =
      typeof rawMeta?.discordAuthorAvatarUrl === 'string' ? rawMeta.discordAuthorAvatarUrl : null
    const base = {
      id: m.id,
      threadId: `league:${leagueId}`,
      senderUserId: m.user?.id ?? null,
      senderName: discordAuthorName || m.user?.displayName || m.user?.email || 'User',
      senderUsername: m.user?.username ?? null,
      senderAvatarUrl: discordAuthorAvatarUrl ?? m.user?.avatarUrl ?? null,
      senderAvatarPreset: m.user?.profile?.avatarPreset ?? null,
      messageType: m.type || 'text',
      body: m.message || '',
      createdAt: m.createdAt.toISOString(),
    }
    const baseMeta = ((m as { metadata?: Record<string, unknown> }).metadata ?? {}) as Record<string, unknown>
    const withImage = (m as { imageUrl?: string | null }).imageUrl
      ? { ...baseMeta, imageUrl: (m as { imageUrl?: string | null }).imageUrl }
      : baseMeta
    const withPresence = { ...withImage, lastActiveAt: m.createdAt.toISOString() }
    const meta = Object.keys(withPresence).length > 0 ? withPresence : undefined
    return meta ? { ...base, metadata: meta } : base
  })
}

export async function createLeagueChatMessage(
  leagueId: string,
  userId: string,
  message: string,
  options: {
    type?: string
    imageUrl?: string | null
    metadata?: Record<string, unknown>
    source?: string | null
    discordMessageId?: string | null
    sourceDiscord?: boolean
  }
): Promise<PlatformChatMessage | null> {
  const source =
    typeof options.source === 'string' && options.source.trim()
      ? options.source.trim()
      : options.source === null
        ? null
        : null
  const created = await prisma.leagueChatMessage.create({
    data: {
      leagueId,
      userId,
      message,
      type: options.type ?? 'text',
      imageUrl: options.imageUrl ?? null,
      metadata: options.metadata ?? undefined,
      source,
      discordMessageId: options.discordMessageId ?? null,
      sourceDiscord: options.sourceDiscord ?? false,
    },
    include: includeUser,
  })
  const withUser = created as typeof created & {
    user?: {
      id: string
      username: string | null
      displayName: string | null
      email: string | null
      avatarUrl: string | null
      profile?: { avatarPreset?: string | null } | null
    }
  }
  const cm = (created as { metadata?: Record<string, unknown> }).metadata
  const inboundName = typeof cm?.discordAuthorName === 'string' ? cm.discordAuthorName : null
  const inboundAvatar =
    typeof cm?.discordAuthorAvatarUrl === 'string' ? cm.discordAuthorAvatarUrl : null
  const out: PlatformChatMessage = {
    id: created.id,
    threadId: `league:${leagueId}`,
    senderUserId: withUser.user?.id ?? created.userId,
    senderName: inboundName || withUser.user?.displayName || withUser.user?.email || 'User',
    senderUsername: withUser.user?.username ?? null,
    senderAvatarUrl: inboundAvatar ?? withUser.user?.avatarUrl ?? null,
    senderAvatarPreset: withUser.user?.profile?.avatarPreset ?? null,
    messageType: created.type || 'text',
    body: created.message || '',
    createdAt: created.createdAt.toISOString(),
  }
  if (created.imageUrl || (created as { metadata?: Record<string, unknown> }).metadata) {
    const baseMeta = ((created as { metadata?: Record<string, unknown> }).metadata ?? {}) as Record<string, unknown>
    out.metadata = {
      ...baseMeta,
      ...(created.imageUrl && { imageUrl: created.imageUrl }),
      lastActiveAt: created.createdAt.toISOString(),
    }
  }
  return out
}

export async function updateLeagueChatMessage(
  messageId: string,
  updates: { message?: string; metadata?: Record<string, unknown> }
): Promise<{ id: string } | null> {
  const data: { message?: string; metadata?: Record<string, unknown> } = {}
  if (typeof updates.message === 'string') data.message = updates.message
  if (updates.metadata && typeof updates.metadata === 'object') data.metadata = updates.metadata
  if (!Object.keys(data).length) return null
  try {
    const row = await prisma.leagueChatMessage.update({
      where: { id: messageId },
      data,
      select: { id: true },
    })
    return row
  } catch {
    return null
  }
}
