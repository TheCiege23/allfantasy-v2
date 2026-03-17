/**
 * Moderation — block, report, safety visibility, queue, user actions, chat resolve, content filter.
 */

export {
  addBlock,
  removeBlock,
  getBlockedUserIds,
  getBlockedUsersWithDetails,
  isUserBlockedBy,
} from "./BlockUserService"
export type { BlockedUserInfo } from "./BlockUserService"

export {
  createMessageReport,
  createUserReport,
  REPORT_REASONS,
  REPORT_STATUS,
  isValidReason,
} from "./ReportSubmissionService"
export type { ReportReason } from "./ReportSubmissionService"

export {
  getMessageReportQueue,
  getUserReportQueue,
  REPORT_STATUSES,
} from "./ModerationQueueService"
export type { ReportStatus, MessageReportItem, UserReportItem } from "./ModerationQueueService"

export {
  applyModerationAction,
  removeBan,
  removeMute,
  isUserBanned,
  isUserMuted,
  getActiveActionsForUser,
  MODERATION_ACTION_TYPES,
} from "./UserModerationService"
export type { ModerationActionType, ApplyActionInput, ModerationActionRecord } from "./UserModerationService"

export {
  updateMessageReportStatus,
  updateUserReportStatus,
  getMessageReportById,
  getUserReportById,
} from "./ChatModerationService"

export {
  checkProfanity,
  checkSpam,
  moderateText,
  moderateWithAI,
} from "./AIContentModerationBridge"
export type { ContentModerationResult } from "./AIContentModerationBridge"

export {
  filterThreadsByBlocked,
  filterMessagesByBlocked,
  getBlockedMessagePlaceholder,
} from "./SafetyVisibilityResolver"

export {
  BLOCK_API,
  UNBLOCK_API,
  BLOCKED_LIST_API,
  REPORT_MESSAGE_API,
  REPORT_USER_API,
  getBlockPayload,
  getUnblockPayload,
  getReportMessagePayload,
  getReportUserPayload,
} from "./ConversationSafetyResolver"
