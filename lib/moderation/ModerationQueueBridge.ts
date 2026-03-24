/**
 * ModerationQueueBridge — normalized moderation queue payload for admin surfaces.
 */

import { prisma } from "@/lib/prisma"
import { getMessageReportQueue, getUserReportQueue } from "./ModerationQueueService"

export interface ModerationBlockedUserItem {
  id: string
  blockerUserId: string
  blockedUserId: string
  createdAt: Date
  blockedEmail?: string | null
  blockedUsername?: string | null
}

export interface ModerationQueueSnapshot {
  reportedContent: Awaited<ReturnType<typeof getMessageReportQueue>>
  reportedUsers: Awaited<ReturnType<typeof getUserReportQueue>>
  blockedUsers: ModerationBlockedUserItem[]
}

export async function getModerationQueueSnapshot(limit = 50): Promise<ModerationQueueSnapshot> {
  const safeLimit = Math.min(100, Math.max(1, Number(limit || 50)))
  const [reportedContent, reportedUsers, blockedRows] = await Promise.all([
    getMessageReportQueue({ limit: safeLimit, offset: 0 }),
    getUserReportQueue({ limit: safeLimit, offset: 0 }),
    prisma.platformBlockedUser.findMany({
      orderBy: { createdAt: "desc" },
      take: safeLimit,
      include: {
        blocked: { select: { email: true, username: true } },
      },
    }),
  ])

  return {
    reportedContent,
    reportedUsers,
    blockedUsers: blockedRows.map((row) => ({
      id: row.id,
      blockerUserId: row.blockerUserId,
      blockedUserId: row.blockedUserId,
      createdAt: row.createdAt,
      blockedEmail: row.blocked?.email ?? null,
      blockedUsername: row.blocked?.username ?? null,
    })),
  }
}
