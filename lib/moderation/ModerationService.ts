/**
 * ModerationService — high-level safety orchestration for chat flows.
 */

import type { PlatformChatThread } from "@/types/platform-shared"
import { createMessageReport, createUserReport, isValidReason } from "./ReportSubmissionService"
import { getBlockedUserIds } from "./BlockUserService"
import { filterThreadsByBlocked } from "./SafetyVisibilityResolver"

export async function submitMessageReportForUser(input: {
  reporterUserId: string
  messageId: string
  threadId: string
  reason: string
}): Promise<{ ok: boolean; reportId?: string; error?: string }> {
  const reason = String(input.reason || "").trim()
  if (!reason) return { ok: false, error: "reason required" }
  if (!isValidReason(reason)) return { ok: false, error: "Invalid reason" }

  const created = await createMessageReport(
    input.reporterUserId,
    input.messageId,
    input.threadId,
    reason
  )
  if (!created?.id) return { ok: false, error: "Could not submit report" }
  return { ok: true, reportId: created.id }
}

export async function submitUserReportForUser(input: {
  reporterUserId: string
  reportedUserId: string
  reason: string
}): Promise<{ ok: boolean; reportId?: string; error?: string }> {
  const reason = String(input.reason || "").trim()
  if (!input.reportedUserId) return { ok: false, error: "reportedUserId required" }
  if (!reason) return { ok: false, error: "reason required" }
  if (!isValidReason(reason)) return { ok: false, error: "Invalid reason" }
  if (input.reportedUserId === input.reporterUserId) return { ok: false, error: "Cannot report yourself" }

  const created = await createUserReport(input.reporterUserId, input.reportedUserId, reason)
  if (!created?.id) return { ok: false, error: "Could not submit report" }
  return { ok: true, reportId: created.id }
}

export async function resolveConversationSafetyForUser(
  appUserId: string,
  threads: PlatformChatThread[]
): Promise<{ threads: PlatformChatThread[]; blockedUserIds: string[] }> {
  const blockedUserIds = await getBlockedUserIds(appUserId)
  if (!blockedUserIds.length) return { threads, blockedUserIds: [] }
  const filteredThreads = filterThreadsByBlocked(threads, new Set(blockedUserIds), appUserId)
  return { threads: filteredThreads, blockedUserIds }
}
