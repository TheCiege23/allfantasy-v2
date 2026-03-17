/**
 * Commissioner announcements: send @everyone broadcast to league chat.
 * Requires league chat thread to be linked (league.settings.leagueChatThreadId).
 */

import { prisma } from "@/lib/prisma"

export type AnnouncementResult = { ok: true; message?: string } | { ok: false; error: string }

export async function getLeagueChatThreadId(leagueId: string): Promise<string | null> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { settings: true },
  })
  const settings = (league?.settings as Record<string, unknown>) || {}
  const threadId = settings.leagueChatThreadId
  return typeof threadId === "string" ? threadId : null
}

/**
 * Caller must POST to /api/shared/chat/threads/[threadId]/broadcast with announcement.
 * This service only resolves threadId for the league.
 */
export async function resolveAnnouncementContext(leagueId: string): Promise<{
  threadId: string | null
  canAnnounce: boolean
}> {
  const threadId = await getLeagueChatThreadId(leagueId)
  return { threadId, canAnnounce: !!threadId }
}
