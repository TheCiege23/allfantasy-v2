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
    const base = {
      id: m.id,
      threadId: `league:${leagueId}`,
      senderUserId: m.user?.id ?? null,
      senderName: m.user?.displayName || m.user?.email || 'User',
      senderUsername: m.user?.username ?? null,
      senderAvatarUrl: m.user?.avatarUrl ?? null,
      senderAvatarPreset: m.user?.profile?.avatarPreset ?? null,
      messageType: m.type || 'text',
      body: m.message || '',
      createdAt: m.createdAt.toISOString(),
    }
    const meta = (m as { imageUrl?: string | null; metadata?: Record<string, unknown> }).imageUrl
      ? { ...((m as { metadata?: Record<string, unknown> }).metadata ?? {}), imageUrl: (m as { imageUrl?: string | null }).imageUrl }
      : ((m as { metadata?: Record<string, unknown> }).metadata ?? undefined)
    return meta ? { ...base, metadata: meta } : base
  })
}

export async function createLeagueChatMessage(
  leagueId: string,
  userId: string,
  message: string,
  options: { type?: string; imageUrl?: string | null; metadata?: Record<string, unknown>; source?: string | null }
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
  const out: PlatformChatMessage = {
    id: created.id,
    threadId: `league:${leagueId}`,
    senderUserId: withUser.user?.id ?? created.userId,
    senderName: withUser.user?.displayName || withUser.user?.email || 'User',
    senderUsername: withUser.user?.username ?? null,
    senderAvatarUrl: withUser.user?.avatarUrl ?? null,
    senderAvatarPreset: withUser.user?.profile?.avatarPreset ?? null,
    messageType: created.type || 'text',
    body: created.message || '',
    createdAt: created.createdAt.toISOString(),
  }
  if (created.imageUrl || (created as { metadata?: Record<string, unknown> }).metadata) {
    out.metadata = {
      ...((created as { metadata?: Record<string, unknown> }).metadata ?? {}),
      ...(created.imageUrl && { imageUrl: created.imageUrl }),
    }
  }
  return out
}
