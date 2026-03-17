/**
 * Bridge for moderation panel: reported content, reported users, blocked users.
 */

import { prisma } from "@/lib/prisma"
import type { ReportedContentItem, ReportedUserItem, BlockedUserItem } from "./types"

const DEFAULT_PAGE_SIZE = 50

export async function getReportedContent(limit: number = DEFAULT_PAGE_SIZE): Promise<ReportedContentItem[]> {
  const reports = await prisma.platformMessageReport.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  })
  return reports.map((r) => ({
    id: r.id,
    messageId: r.messageId,
    threadId: r.threadId,
    reporterUserId: r.reporterUserId,
    reason: r.reason,
    status: r.status,
    createdAt: r.createdAt,
  }))
}

export async function getReportedUserRecords(limit: number = DEFAULT_PAGE_SIZE): Promise<ReportedUserItem[]> {
  const reports = await prisma.platformUserReport.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      reported: { select: { email: true, username: true } },
    },
  })
  return reports.map((r) => ({
    id: r.id,
    reportedUserId: r.reportedUserId,
    reporterUserId: r.reporterUserId,
    reason: r.reason,
    status: r.status,
    createdAt: r.createdAt,
    reportedEmail: r.reported?.email,
    reportedUsername: r.reported?.username,
  }))
}

export async function getBlockedUsers(limit: number = DEFAULT_PAGE_SIZE): Promise<BlockedUserItem[]> {
  const blocks = await prisma.platformBlockedUser.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      blocked: { select: { email: true, username: true } },
    },
  })
  return blocks.map((b) => ({
    id: b.id,
    blockerUserId: b.blockerUserId,
    blockedUserId: b.blockedUserId,
    createdAt: b.createdAt,
    blockedEmail: b.blocked?.email,
    blockedUsername: b.blocked?.username,
  }))
}
