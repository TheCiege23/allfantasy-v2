/**
 * Decision OS — Phase 5.0 Behavioral Facts contract.
 *
 * Defines what can be DERIVED from a stream of BehavioralEvents for a manager or league.
 * These are the interfaces that Manager Intelligence, League Intelligence, and Platform
 * Intelligence will consume.
 *
 * Phase 5.0 is TYPE DEFINITIONS ONLY.
 * The assembler that populates these facts from raw events is Phase 5.1.
 *
 * Nothing here performs IO or imports from existing Stage 1 slices.
 */

import type { BehavioralEvent } from './events/types'
import type { BehavioralEventType } from './events/taxonomy'

// ── Manager behavioral facts ─────────────────────────────────────────────────

/**
 * Behavioral state of a single manager within a single league, derived from their
 * observed events over a lookback window.
 *
 * Completeness degrades honestly when events are missing from the record:
 * - engagement events may not be captured for older leagues
 * - import-sourced events may lack actor confirmation
 *
 * The null-safety contract: every numeric count is 0 when no events were observed
 * (not null). Counts are never fabricated — 0 means "none seen," which may reflect
 * either genuine inactivity or an incomplete event record (see `completeness`).
 */
export interface ManagerBehavioralFacts {
  managerId: string
  leagueId: string

  // ── Activity signals ──────────────────────────────────────────────────────

  /** Most recent `lineup_saved` event; null when none in the lookback window. */
  lastLineupSave: BehavioralEvent | null
  /** Most recent event of any type; null when no events in the lookback window. */
  lastActivity: BehavioralEvent | null

  /** Count of `lineup_saved` events. */
  lineupSaveCount: number
  /** Count of `trade_created` events (proposals this manager initiated). */
  tradeProposalCount: number
  /** Count of `trade_accepted` events. */
  tradeAcceptedCount: number
  /** Count of `trade_rejected` events. */
  tradeRejectedCount: number
  /** Count of `waiver_claim_created` events. */
  waiverClaimCount: number
  /** Count of `waiver_claim_processed` events where outcome === 'awarded'. */
  waiverSuccessCount: number
  /** Count of `commissioner_action` events (for leagues where this manager is commissioner). */
  commissionerActionCount: number

  // ── Engagement signals ────────────────────────────────────────────────────

  /** Count of `league_opened` events. */
  leagueOpenCount: number
  /** Count of `live_scoring_opened` events. */
  liveScoringSessionCount: number
  /** Count of `recap_viewed` events. */
  recapViewCount: number
  /** Count of `draft_pick_made` events. */
  draftPickCount: number

  // ── Data quality ──────────────────────────────────────────────────────────

  /** 0–100 honest completeness. Low when event records are sparse or import-sourced. */
  completeness: number
  /** Number of raw events that fed these facts. */
  eventCount: number
  /** How many days back events were collected. Null = all available history. */
  lookbackDays: number | null
  /** Soft warnings about gaps in the behavioral record. */
  warnings: string[]
}

// ── League behavioral facts ──────────────────────────────────────────────────

/**
 * Behavioral state of an entire league, aggregated across all managers' events.
 *
 * Used by League Intelligence to assess league health, engagement, and activity
 * independent of the canonical World facts (which cover roster/record structure).
 */
export interface LeagueBehavioralFacts {
  leagueId: string

  // ── Aggregated transaction signals ────────────────────────────────────────

  /** Total `trade_created` events across all managers. */
  totalTradeCount: number
  /** Total `waiver_claim_created` events across all managers. */
  totalWaiverClaimCount: number
  /** Total `waiver_claim_processed` events where outcome === 'awarded'. */
  totalWaiverSuccessCount: number
  /** Total `commissioner_action` events. */
  totalCommissionerActionCount: number
  /** Total `rules_changed` events. */
  totalRulesChangeCount: number

  // ── Engagement signals ────────────────────────────────────────────────────

  /** Manager IDs who had at least one event in the lookback window. */
  activeManagerIds: string[]
  /** Most recent event across any manager. Null when no events in the lookback window. */
  lastActivity: BehavioralEvent | null

  // ── Draft signals ─────────────────────────────────────────────────────────

  /** Number of `draft_started` events observed for this league. */
  draftCount: number
  /** Total `draft_pick_made` events. */
  totalDraftPickCount: number

  // ── Data quality ──────────────────────────────────────────────────────────

  /** 0–100 honest completeness. */
  completeness: number
  /** Total events across all managers that fed these facts. */
  eventCount: number
  /** Number of distinct managers whose events were included. */
  managerCount: number
  /** How many days back events were collected. Null = all available history. */
  lookbackDays: number | null
  /** Soft warnings about gaps. */
  warnings: string[]
}

// ── Completeness profile ─────────────────────────────────────────────────────

/**
 * Per-event-type coverage profile for a manager or league behavioral fact set.
 * Used by downstream consumers to know which event types had data and which were empty.
 */
export interface BehavioralFactsCoverage {
  /** 0–100 overall completeness. */
  score: number
  /** Which event types had at least one event. */
  coveredTypes: BehavioralEventType[]
  /** Which event types had zero events (may be inactivity or missing record). */
  uncoveredTypes: BehavioralEventType[]
  /** Per-event-type counts. Missing key = 0. */
  countsByType: Partial<Record<BehavioralEventType, number>>
  /** Soft warnings about gaps or low-confidence events. */
  warnings: string[]
}

// ── Assembly input shape (used by Phase 5.1 assembler) ──────────────────────

/**
 * The minimal input the Phase 5.1 assembler needs to produce ManagerBehavioralFacts.
 * Defined here so consumers can type-check against it before the assembler exists.
 */
export interface ManagerBehavioralAssemblyInput {
  managerId: string
  leagueId: string
  events: BehavioralEvent[]
  lookbackDays?: number
}

/**
 * The minimal input the Phase 5.1 assembler needs to produce LeagueBehavioralFacts.
 */
export interface LeagueBehavioralAssemblyInput {
  leagueId: string
  /** Events from all managers in the league, merged. */
  events: BehavioralEvent[]
  lookbackDays?: number
}
