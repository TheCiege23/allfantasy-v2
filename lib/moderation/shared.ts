/**
 * Shared moderation constants safe for client/server imports.
 */

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
