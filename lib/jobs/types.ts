/**
 * Background job types — queue names and payload shapes for BullMQ.
 */

export const QUEUE_NAMES = {
  AI: "ai",
  NOTIFICATIONS: "notifications",
  SIMULATIONS: "simulations",
} as const

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES]

/** Payload for notification jobs: dispatch in-app + optional email/SMS/push. */
export interface NotificationJobPayload {
  userIds: string[]
  category: string
  productType?: "shared" | "app" | "bracket" | "legacy"
  type: string
  title: string
  body?: string
  actionHref?: string
  actionLabel?: string
  meta?: Record<string, unknown>
  severity?: "low" | "medium" | "high"
}

/** AI job types; payload is type-specific. */
export type AiJobType =
  | "trade_analysis"
  | "waiver_analysis"
  | "draft_insight"
  | "digest"

export interface AiJobPayload {
  type: AiJobType
  userId?: string
  leagueId?: string
  payload: Record<string, unknown>
}

/** Simulation job payload (e.g. mock draft). */
export interface SimulationJobPayload {
  leagueId?: string
  rounds?: number
  draftType?: string
  [key: string]: unknown
}
