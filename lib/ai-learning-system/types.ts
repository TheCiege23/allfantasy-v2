/**
 * AllFantasy 3-level AI learning — deterministic aggregates only (not LLM training).
 * Learned outputs are explainable, timestamped, and recomputable from `AfLearningEvent`.
 */

/** Explainability bundle attached to every snapshot. */
export type AfLearningExplainV1 = {
  version: 1
  /** Human-readable top drivers of the current scores (keys match feature fields where possible). */
  topFactors: Array<{ key: string; value: string | number; detail?: string }>
  sampleSize: number
  windowDays: number
  computedAt: string
  /** Source categories that fed this snapshot (e.g. lineup_change, trade_accepted). */
  sources: string[]
  notes?: string[]
}

/** App-wide (platform) learned state for one sport. */
export type AppLearningFeaturesV1 = {
  version: 1
  windowDays: number
  eventCounts: Record<string, number>
  totalEvents: number
  distinctLeagues: number
  distinctUsers: number
  eventsPerDay: number
  /** 0–1 composite from observed event rate (log-scaled, capped). */
  platformActivityIndex: number
  /** Share of events that are lineup_change (when that signal exists). */
  lineupChangeShare: number | null
  /**
   * Among resolved two-party trade outcomes (`trade_accepted` / `trade_rejected` / `trade_vetoed`),
   * share that ended accepted. Computed from pair-normalized counts (each resolution emits 2 rows).
   */
  tradeResolvedAcceptRate: number | null
}

/** League-specific learned state. */
export type LeagueLearningFeaturesV1 = {
  version: 1
  windowDays: number
  eventCounts: Record<string, number>
  totalEvents: number
  lineupChangesPerWeek: number
  eventsPerWeek: number
  /** Ratio vs app-wide average for this sport (1.0 ≈ typical). */
  activityVsAppAverage: number | null
  leagueActivityIndex: number
  /** Same interpretation as app-level, for this league’s events only. */
  tradeResolvedAcceptRate: number | null
  /** Sum of waiver submission + award events per week (activity proxy). */
  waiverIntensityPerWeek: number
}

/** User / manager behavior profile (soft weights — never injury/lock truth). */
export type UserLearningFeaturesV1 = {
  version: 1
  windowDays: number
  eventCounts: Record<string, number>
  totalEvents: number
  lineupChangesPerWeek: number
  /** low | medium | high — from lineup_change rate thresholds. */
  managerLineupActivityTier: 'low' | 'medium' | 'high'
  /** 0–1 — higher = more frequent self-serve lineup edits in window. */
  lineupEditPropensity: number
  /** `trade_proposal_created` events in window (intent to trade). */
  tradeProposalsInWindow: number
  /** Among this user’s trade outcome rows, share accepted (single row per user per outcome). */
  userTradeResolutionAcceptRate: number | null
  /** 0–1 from proposal volume (capped). */
  userTradeAggressionScore: number
  /** Submitted + awarded waiver claims in window. */
  waiverClaimEventsInWindow: number
  /** 0–1 from waiver event volume (capped). */
  userWaiverAggressionScore: number
  /** `draft_pick_made` events in window (mock + live drafts). */
  draftPicksInWindow: number
  /** 0–1 from draft activity volume (capped). */
  userDraftActivityScore: number
}

export type AfLearningSnapshotRow = {
  features: unknown
  explain: unknown | null
  confidence: number
  sampleSize: number
  windowDays: number
  updatedAt: Date
  computedAt: Date
}

/** Injected into `AllFantasyStandardAiPayload.learningLayers`. */
export type AllFantasyLearningLayersPayload = {
  schemaVersion: 1
  sport: string
  leagueId: string | null
  userId: string
  /** Platform intelligence for the active sport. */
  appLearningState: {
    loaded: boolean
    snapshot: AfLearningSnapshotRow | null
  }
  /** League economy / activity (null when not in a league context). */
  leagueLearningState: {
    loaded: boolean
    leagueId: string | null
    snapshot: AfLearningSnapshotRow | null
  }
  /** User tendencies (soft personalization). */
  userLearningState: {
    loaded: boolean
    snapshot: AfLearningSnapshotRow | null
  }
  /**
   * Short prompt-safe reminder: learned layers adjust tone/priorities only;
   * injuries, locks, eligibility, and scoring rules always win.
   */
  safetyReminder: string
}
