/**
 * Moderation queue: list reported messages and reported users with filters.
 */

import { prisma } from "@/lib/prisma"

export const REPORT_STATUSES = ["pending", "reviewed", "resolved", "dismissed"] as const
export type ReportStatus = (typeof REPORT_STATUSES)[number]

export interface MessageReportItem {
  id: string
  messageId: string
  threadId: string
  reporterUserId: string
  reason: string
  status: string
  createdAt: Date
}

export interface UserReportItem {
  id: string
  reportedUserId: string
  reporterUserId: string
  reason: string
  status: string
  createdAt: Date
  reportedEmail?: string | null
  reportedUsername?: string | null
}

export async function getMessageReportQueue(opts: {
  status?: ReportStatus | null
  limit?: number
  offset?: number
}): Promise<MessageReportItem[]> {
  const { status, limit = 50, offset = 0 } = opts
  const where = status ? { status } : {}
  const rows = await prisma.platformMessageReport.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  })
  return rows.map((r) => ({
    id: r.id,
    messageId: r.messageId,
    threadId: r.threadId,
    reporterUserId: r.reporterUserId,
    reason: r.reason,
    status: r.status,
    createdAt: r.createdAt,
  }))
}

export async function getUserReportQueue(opts: {
  status?: ReportStatus | null
  limit?: number
  offset?: number
}): Promise<UserReportItem[]> {
  const { status, limit = 50, offset = 0 } = opts
  const where = status ? { status } : {}
  const rows = await prisma.platformUserReport.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
    include: {
      reported: { select: { email: true, username: true } },
    },
  })
  return rows.map((r) => ({
    id: r.id,
    reportedUserId: r.reportedUserId,
    reporterUserId: r.reporterUserId,
    reason: r.reason,
    status: r.status,
    createdAt: r.createdAt,
    reportedEmail: r.reported?.email ?? null,
    reportedUsername: r.reported?.username ?? null,
  }))
}
