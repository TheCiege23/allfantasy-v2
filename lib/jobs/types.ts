/**
 * Background job types — queue names and payload shapes for BullMQ.
 */

export const QUEUE_NAMES = {
  AI: "ai",
  NOTIFICATIONS: "notifications",
  SIMULATIONS: "simulations",
  DEVY: "devy",
  INTEGRITY: "integrity",
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
  | "autocoach_pregame_scan"
  | "autocoach_status_check"

export interface AiJobPayload {
  type: AiJobType
  userId?: string
  leagueId?: string
  /** e.g. autocoach: `{ rosterId?, gameSlateDate?, sport? }` */
  payload: Record<string, unknown>
}

/** Simulation job payload (e.g. mock draft). */
export interface SimulationJobPayload {
  leagueId?: string
  rounds?: number
  draftType?: string
  [key: string]: unknown
}

/** Devy Dynasty / C2C background job types (NCAA sync, graduation, pools, snapshots, rankings, C2C). */
export type DevyJobType =
  | "ncaa_player_sync"
  | "declare_status_refresh"
  | "auto_graduation_after_draft"
  | "rookie_pool_generation"
  | "devy_pool_generation"
  | "promotion_window_sync"
  | "rookie_draft_exclusion_list"
  | "best_ball_lineup_snapshot"
  | "rankings_refresh_after_promotions"
  | "class_strength_snapshot"
  | "hybrid_standings_recompute"
  | "c2c_pipeline_recalculation"

export interface DevyJobPayload {
  type: DevyJobType
  leagueId?: string
  sport?: string
  seasonYear?: number
  rosterId?: string
  periodKey?: string
  [key: string]: unknown
}

/** Integrity / collusion / tanking background jobs (BullMQ). */
export type IntegrityJobType =
  | "collusion_scan_trade"
  | "collusion_scan_league"
  | "tanking_scan_week"
  | "tanking_scan_league"

export interface IntegrityJobPayload {
  type: IntegrityJobType
  leagueId: string
  tradeTransactionId?: string
  tradingRosterIds?: string[]
  weekNumber?: number
}
