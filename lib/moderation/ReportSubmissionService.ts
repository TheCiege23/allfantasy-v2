/**
 * ReportSubmissionService — submit message and user reports (PlatformMessageReport, PlatformUserReport).
 */

import { prisma } from "@/lib/prisma"
import { REPORT_REASONS, type ReportReason } from "./shared"

export async function createMessageReport(
  reporterUserId: string,
  messageId: string,
  threadId: string,
  reason: string
): Promise<{ id: string } | null> {
  if (!reporterUserId || !messageId || !threadId || !reason.trim()) return null
  const r = reason.trim().slice(0, 500)
  try {
    const canAccessThread = await prisma.platformChatThreadMember.findFirst({
      where: { userId: reporterUserId, threadId, isBlocked: false },
      select: { id: true },
    })
    if (!canAccessThread) return null

    const message = await prisma.platformChatMessage.findFirst({
      where: { id: messageId, threadId },
      select: { id: true, senderUserId: true },
    })
    if (!message) return null
    if (message.senderUserId && message.senderUserId === reporterUserId) return null

    const existingPending = await prisma.platformMessageReport.findFirst({
      where: { messageId, threadId, reporterUserId, status: "pending" },
      select: { id: true },
    })
    if (existingPending) return existingPending

    const created = await prisma.platformMessageReport.create({
      data: {
        messageId,
        threadId,
        reporterUserId,
        reason: r,
        status: "pending",
      },
      select: { id: true },
    })
    return created
  } catch {
    return null
  }
}

export async function createUserReport(
  reporterUserId: string,
  reportedUserId: string,
  reason: string
): Promise<{ id: string } | null> {
  if (!reporterUserId || !reportedUserId || reporterUserId === reportedUserId || !reason.trim()) return null
  const r = reason.trim().slice(0, 500)
  try {
    const reportedExists = await prisma.appUser.findUnique({
      where: { id: reportedUserId },
      select: { id: true },
    })
    if (!reportedExists) return null

    const existingPending = await prisma.platformUserReport.findFirst({
      where: { reporterUserId, reportedUserId, status: "pending" },
      select: { id: true },
    })
    if (existingPending) return existingPending

    const created = await prisma.platformUserReport.create({
      data: {
        reportedUserId,
        reporterUserId,
        reason: r,
        status: "pending",
      },
      select: { id: true },
    })
    return created
  } catch {
    return null
  }
}

export function isValidReason(reason: string): boolean {
  return REPORT_REASONS.includes(reason as ReportReason) || reason === "other"
}
