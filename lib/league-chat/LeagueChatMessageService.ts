/**
 * League chat messages for main app League (LeagueChatMessage).
 * Used by shared chat when threadId = league:leagueId and league is main League (not BracketLeague).
 */

import { prisma } from '@/lib/prisma'
import type { PlatformChatMessage } from '@/types/platform-shared'

const includeUser = { user: { select: { id: true, displayName: true, email: true, avatarUrl: true } } }

export async function getLeagueChatMessages(
  leagueId: string,
  options: { limit?: number; before?: Date; source?: 'draft' | null; /** when undefined, league channel = exclude draft-only */ }
): Promise<PlatformChatMessage[]> {
  const limit = Math.min(options.limit ?? 50, 100)
  const where: Record<string, unknown> = { leagueId }
  if (options.source === 'draft') {
    where.source = 'draft'
  } else if (options.source === null) {
    where.source = null
  } else if (options.source === undefined) {
    where.OR = [{ source: null }, { source: { not: 'draft' } }]
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
  return rows.reverse().map((m) => ({
    id: m.id,
    threadId: `league:${leagueId}`,
    senderUserId: m.user?.id ?? null,
    senderName: m.user?.displayName || m.user?.email || 'User',
    messageType: m.type || 'text',
    body: m.message || '',
    createdAt: m.createdAt.toISOString(),
  }))
}

export async function createLeagueChatMessage(
  leagueId: string,
  userId: string,
  message: string,
  options: { type?: string; imageUrl?: string | null; metadata?: Record<string, unknown>; source?: 'draft' | null }
): Promise<PlatformChatMessage | null> {
  const created = await prisma.leagueChatMessage.create({
    data: {
      leagueId,
      userId,
      message,
      type: options.type ?? 'text',
      imageUrl: options.imageUrl ?? null,
      metadata: options.metadata ?? undefined,
      source: options.source ?? null,
    },
    include: includeUser,
  })
  const withUser = created as typeof created & { user?: { id: string; displayName: string | null; email: string | null; avatarUrl: string | null } }
  return {
    id: created.id,
    threadId: `league:${leagueId}`,
    senderUserId: withUser.user?.id ?? created.userId,
    senderName: withUser.user?.displayName || withUser.user?.email || 'User',
    messageType: created.type || 'text',
    body: created.message || '',
    createdAt: created.createdAt.toISOString(),
  }
}
