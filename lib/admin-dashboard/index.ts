/**
 * Admin Dashboard core modules.
 * Use requireAdmin() on API routes that consume these.
 */

export * from "./types"
export * from "./AdminDashboardService"
export {
  getLeaguesCountBySport,
  getSportLabel,
  type SportCountItem,
} from "./AdminAnalyticsResolver"
export {
  getNewestUsers,
  getMostActiveUsers,
  getReportedUserSummaries,
} from "./AdminUserManagementService"
export * from "./AdminLeagueManagementService"
export {
  getReportedContent,
  getReportedUserRecords,
  getBlockedUsers,
} from "./AdminModerationBridge"
export * from "./SystemHealthResolver"
