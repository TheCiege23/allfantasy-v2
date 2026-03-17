/**
 * Chat moderation: resolve or dismiss message/user reports.
 */

import { prisma } from "@/lib/prisma"
import { REPORT_STATUSES } from "./ModerationQueueService"
import type { ReportStatus } from "./ModerationQueueService"

export async function updateMessageReportStatus(
  reportId: string,
  status: ReportStatus
): Promise<boolean> {
  if (!REPORT_STATUSES.includes(status)) return false
  try {
    await prisma.platformMessageReport.update({
      where: { id: reportId },
      data: { status },
    })
    return true
  } catch {
    return false
  }
}

export async function updateUserReportStatus(
  reportId: string,
  status: ReportStatus
): Promise<boolean> {
  if (!REPORT_STATUSES.includes(status)) return false
  try {
    await prisma.platformUserReport.update({
      where: { id: reportId },
      data: { status },
    })
    return true
  } catch {
    return false
  }
}

export async function getMessageReportById(reportId: string) {
  return prisma.platformMessageReport.findUnique({
    where: { id: reportId },
  })
}

export async function getUserReportById(reportId: string) {
  return prisma.platformUserReport.findUnique({
    where: { id: reportId },
    include: {
      reported: { select: { id: true, email: true, username: true } },
    },
  })
}
