/**
 * ReportSubmissionService — submit message and user reports (PlatformMessageReport, PlatformUserReport).
 */

import { prisma } from "@/lib/prisma"

export const REPORT_REASONS = [
  "spam",
  "harassment",
  "hate_speech",
  "violence",
  "nudity",
  "self_harm",
  "impersonation",
  "other",
] as const

export type ReportReason = (typeof REPORT_REASONS)[number]

export const REPORT_STATUS = ["pending", "reviewed", "resolved", "dismissed"] as const

export async function createMessageReport(
  reporterUserId: string,
  messageId: string,
  threadId: string,
  reason: string
): Promise<{ id: string } | null> {
  if (!reporterUserId || !messageId || !threadId || !reason.trim()) return null
  const r = reason.trim().slice(0, 500)
  try {
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
